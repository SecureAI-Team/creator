import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateInsightSummary, generateTopicSuggestions } from "@/lib/llm";
import { NextResponse } from "next/server";

/**
 * POST /api/data/insights/summary
 * Generate an LLM-powered natural language summary of current insights.
 * Body: { type: "summary" | "topics" }
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json().catch(() => ({}));
  const type = (body as Record<string, string>).type || "summary";

  if (type === "topics") {
    const recentItems = await prisma.contentItem.findMany({
      where: { userId },
      select: { title: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const performances = await prisma.contentPerformance.findMany({
      where: { userId },
      include: { contentItem: { select: { title: true } } },
      orderBy: { views: "desc" },
      take: 5,
    });

    const result = await generateTopicSuggestions(
      userId,
      recentItems.map((i) => i.title),
      performances.map((p) => ({ title: p.contentItem.title, views: p.views, likes: p.likes }))
    );

    if (!result) {
      return NextResponse.json({ error: "LLM unavailable (no API key configured)" }, { status: 503 });
    }

    return NextResponse.json({ type: "topics", content: result });
  }

  // Default: insight summary
  const insights = await prisma.insightRecord.findMany({
    where: { userId, dismissed: false },
    orderBy: { generatedAt: "desc" },
    take: 20,
  });

  // Get latest metrics snapshot for context
  const latestMetrics = await prisma.platformMetrics.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    distinct: ["platform", "accountId"],
    take: 10,
  });

  const metricsSnapshot: Record<string, unknown> = {};
  for (const m of latestMetrics) {
    metricsSnapshot[m.platform] = {
      followers: m.followers,
      views: m.totalViews,
      likes: m.totalLikes,
    };
  }

  const result = await generateInsightSummary(
    userId,
    insights.map((i) => ({
      type: i.type,
      severity: i.severity,
      platform: i.platform,
      message: i.message,
    })),
    metricsSnapshot
  );

  if (!result) {
    return NextResponse.json({ error: "LLM unavailable (no API key configured)" }, { status: 503 });
  }

  return NextResponse.json({ type: "summary", content: result });
}) as unknown as (req: Request) => Promise<Response>;
