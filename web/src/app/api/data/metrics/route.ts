import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/data/metrics
 * Get platform-level metrics (daily snapshots from data collection).
 * Query params: ?platform=bilibili&days=30
 *
 * Returns:
 *   - latest: most recent snapshot per platform
 *   - history: daily snapshots for charting
 *   - growth: followers change vs previous period
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { searchParams } = req.nextUrl;
  const platform = searchParams.get("platform");
  const days = parseInt(searchParams.get("days") || "30", 10);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const where: Record<string, unknown> = {
    userId,
    date: { gte: since },
  };
  if (platform) {
    where.platform = platform;
  }

  // Get all snapshots in the time range
  const snapshots = await prisma.platformMetrics.findMany({
    where,
    orderBy: { date: "desc" },
  });

  // Group by platform+accountId to support multi-account
  // Key format: "bilibili:default" or "weixin-mp:geo-radar"
  const byKey: Record<string, typeof snapshots> = {};
  for (const s of snapshots) {
    const key = `${s.platform}:${s.accountId}`;
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push(s);
  }

  const latest: Record<string, (typeof snapshots)[0]> = {};
  for (const [key, arr] of Object.entries(byKey)) {
    latest[key] = arr[0]; // Already sorted desc, first is latest
  }

  // Calculate growth (compare latest to oldest in range)
  const growth: Record<string, { followers: number; views: number }> = {};
  for (const [key, arr] of Object.entries(byKey)) {
    if (arr.length >= 2) {
      const newest = arr[0];
      const oldest = arr[arr.length - 1];
      growth[key] = {
        followers: newest.followers - oldest.followers,
        views: newest.totalViews - oldest.totalViews,
      };
    } else {
      growth[key] = { followers: 0, views: 0 };
    }
  }

  // Build history for charting (chronological order)
  const history = snapshots.reverse().map((s) => ({
    platform: s.platform,
    accountId: s.accountId,
    date: s.date.toISOString().substring(0, 10),
    followers: s.followers,
    totalViews: s.totalViews,
    totalLikes: s.totalLikes,
    totalComments: s.totalComments,
    totalShares: s.totalShares,
    contentCount: s.contentCount,
  }));

  return NextResponse.json({
    latest,
    growth,
    history,
    period: { days, since: since.toISOString() },
  });
}) as unknown as (req: Request) => Promise<Response>;
