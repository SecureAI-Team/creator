import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/data
 * Get analytics data for the current user.
 * Query params: ?platform=bilibili&days=7
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { searchParams } = req.nextUrl;
  const platform = searchParams.get("platform"); // optional filter
  const days = parseInt(searchParams.get("days") || "7", 10);

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get publish records with metrics
  const whereClause: Record<string, unknown> = {
    contentItem: { userId },
    publishedAt: { gte: since },
  };
  if (platform) {
    whereClause.platform = platform;
  }

  const publishRecords = await prisma.publishRecord.findMany({
    where: whereClause,
    include: {
      contentItem: { select: { title: true, contentType: true } },
    },
    orderBy: { publishedAt: "desc" },
  });

  // Aggregate totals
  const totals = publishRecords.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      likes: acc.likes + r.likes,
      comments: acc.comments + r.comments,
      shares: acc.shares + r.shares,
    }),
    { views: 0, likes: 0, comments: 0, shares: 0 }
  );

  // Content stats
  const contentStats = await prisma.contentItem.groupBy({
    by: ["status"],
    where: { userId },
    _count: true,
  });

  // Platform connections status
  const platforms = await prisma.platformConnection.findMany({
    where: { userId },
    select: {
      platformKey: true,
      status: true,
      lastChecked: true,
    },
  });

  return NextResponse.json({
    period: { days, since: since.toISOString() },
    totals,
    records: publishRecords,
    contentStats: contentStats.map((s) => ({
      status: s.status,
      count: s._count,
    })),
    platforms,
  });
}) as unknown as (req: Request) => Promise<Response>;
