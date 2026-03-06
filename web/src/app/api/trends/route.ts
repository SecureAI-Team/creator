import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/trends
 * Return trending topics for the current user, persisted from last refresh.
 * Query params: ?platform=douyin
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { searchParams } = req.nextUrl;
  const platform = searchParams.get("platform");

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    userId,
    collectedAt: { gte: sixHoursAgo },
  };
  if (platform && platform !== "all") {
    where.platform = platform;
  }

  const trends = await prisma.trend.findMany({
    where,
    orderBy: [{ platform: "asc" }, { rank: "asc" }],
    take: 200,
  });

  const lastTrend = trends.length > 0 ? trends[0] : null;

  return NextResponse.json({
    trends: trends.map((t) => ({
      id: t.id,
      rank: t.rank,
      title: t.title,
      platform: t.platform,
      heat: t.heat,
    })),
    lastUpdated: lastTrend?.collectedAt?.toISOString() ?? null,
  });
}) as unknown as (req: Request) => Promise<Response>;
