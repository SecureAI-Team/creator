import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { backfillCanonical } from "@/lib/canonical";
import { NextResponse } from "next/server";

/**
 * GET /api/data/canonical
 * Query normalized canonical metrics.
 * Params: ?platform=bilibili&days=30&accountId=default
 *
 * POST /api/data/canonical
 * Trigger backfill of canonical metrics from existing PlatformMetrics rows.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { searchParams } = req.nextUrl;
  const platform = searchParams.get("platform");
  const accountId = searchParams.get("accountId");
  const days = parseInt(searchParams.get("days") || "30", 10);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const where: Record<string, unknown> = {
    userId,
    date: { gte: since },
  };
  if (platform) where.platform = platform;
  if (accountId) where.accountId = accountId;

  const rows = await prisma.canonicalMetrics.findMany({
    where,
    orderBy: { date: "desc" },
  });

  // Group latest per platform:accountId
  const latestByKey: Record<string, (typeof rows)[0]> = {};
  for (const r of rows) {
    const key = `${r.platform}:${r.accountId}`;
    if (!latestByKey[key]) latestByKey[key] = r;
  }

  // Build chronological history
  const history = [...rows].reverse().map((r) => ({
    platform: r.platform,
    accountId: r.accountId,
    date: r.date.toISOString().substring(0, 10),
    exposure: r.exposure,
    plays: r.plays,
    likes: r.likes,
    comments: r.comments,
    shares: r.shares,
    saves: r.saves,
    engagementRate: r.engagementRate,
    followers: r.followers,
    followerDelta: r.followerDelta,
    watchTime: r.watchTime,
  }));

  return NextResponse.json({
    latest: latestByKey,
    history,
    period: { days, since: since.toISOString() },
  });
}) as unknown as (req: Request) => Promise<Response>;

export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await backfillCanonical(req.auth.user.id);
  return NextResponse.json({ success: true, backfilled: count });
}) as unknown as (req: Request) => Promise<Response>;
