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

  // Group by platform and find latest per platform
  const byPlatform: Record<string, typeof snapshots> = {};
  for (const s of snapshots) {
    if (!byPlatform[s.platform]) byPlatform[s.platform] = [];
    byPlatform[s.platform].push(s);
  }

  const latest: Record<string, (typeof snapshots)[0]> = {};
  for (const [p, arr] of Object.entries(byPlatform)) {
    latest[p] = arr[0]; // Already sorted desc, first is latest
  }

  // Calculate growth (compare latest to oldest in range)
  const growth: Record<string, { followers: number; views: number }> = {};
  for (const [p, arr] of Object.entries(byPlatform)) {
    if (arr.length >= 2) {
      const newest = arr[0];
      const oldest = arr[arr.length - 1];
      growth[p] = {
        followers: newest.followers - oldest.followers,
        views: newest.totalViews - oldest.totalViews,
      };
    } else {
      growth[p] = { followers: 0, views: 0 };
    }
  }

  // Build history for charting (chronological order)
  const history = snapshots.reverse().map((s) => ({
    platform: s.platform,
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
