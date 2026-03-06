import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/data/benchmark
 * Anonymous cross-creator benchmark.
 * Compares the current user's metrics against anonymized aggregates.
 * Params: ?platform=bilibili&days=30
 *
 * Requires PRO/ENTERPRISE subscription (benchmarkAccess flag).
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { searchParams } = req.nextUrl;
  const platform = searchParams.get("platform");
  const days = parseInt(searchParams.get("days") || "30", 10);

  // Check subscription access
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { benchmarkAccess: true },
  });

  if (!subscription?.benchmarkAccess) {
    return NextResponse.json(
      { error: "Benchmark 功能需要 PRO 或 ENTERPRISE 套餐", upgrade: true },
      { status: 403 }
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get current user's latest metrics
  const userMetricsWhere: Record<string, unknown> = {
    userId,
    date: { gte: since },
  };
  if (platform) userMetricsWhere.platform = platform;

  const userMetrics = await prisma.platformMetrics.findMany({
    where: userMetricsWhere,
    orderBy: { date: "desc" },
    distinct: ["platform", "accountId"],
  });

  if (userMetrics.length === 0) {
    return NextResponse.json({
      benchmark: [],
      message: "暂无数据，请先进行数据采集",
    });
  }

  // Get aggregated anonymous stats across ALL users (excluding current user)
  const benchmarkResults = [];

  for (const um of userMetrics) {
    const allMetrics = await prisma.platformMetrics.findMany({
      where: {
        platform: um.platform,
        date: { gte: since },
        userId: { not: userId },
      },
      orderBy: { date: "desc" },
      distinct: ["userId", "accountId"],
      select: {
        followers: true,
        totalViews: true,
        totalLikes: true,
        totalComments: true,
      },
    });

    if (allMetrics.length < 3) {
      benchmarkResults.push({
        platform: um.platform,
        accountId: um.accountId,
        userMetrics: {
          followers: um.followers,
          totalViews: um.totalViews,
          totalLikes: um.totalLikes,
          totalComments: um.totalComments,
        },
        benchmark: null,
        message: "同平台创作者数量不足，暂无法生成对比",
      });
      continue;
    }

    // Calculate percentiles
    const calcPercentile = (arr: number[], value: number): number => {
      const sorted = [...arr].sort((a, b) => a - b);
      const below = sorted.filter((v) => v < value).length;
      return Math.round((below / sorted.length) * 100);
    };

    const followerValues = allMetrics.map((m) => m.followers);
    const viewValues = allMetrics.map((m) => m.totalViews);
    const likeValues = allMetrics.map((m) => m.totalLikes);

    const calcAvg = (arr: number[]) =>
      arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
    const calcMedian = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };

    const engagementRates = allMetrics
      .filter((m) => m.totalViews > 0)
      .map((m) => (m.totalLikes + m.totalComments) / m.totalViews);
    const userER = um.totalViews > 0 ? (um.totalLikes + um.totalComments) / um.totalViews : 0;

    benchmarkResults.push({
      platform: um.platform,
      accountId: um.accountId,
      sampleSize: allMetrics.length,
      userMetrics: {
        followers: um.followers,
        totalViews: um.totalViews,
        totalLikes: um.totalLikes,
        totalComments: um.totalComments,
        engagementRate: Math.round(userER * 10000) / 100,
      },
      percentiles: {
        followers: calcPercentile(followerValues, um.followers),
        totalViews: calcPercentile(viewValues, um.totalViews),
        totalLikes: calcPercentile(likeValues, um.totalLikes),
        engagementRate: engagementRates.length > 0
          ? calcPercentile(engagementRates, userER)
          : null,
      },
      aggregates: {
        avgFollowers: calcAvg(followerValues),
        medianFollowers: calcMedian(followerValues),
        avgViews: calcAvg(viewValues),
        medianViews: calcMedian(viewValues),
        avgLikes: calcAvg(likeValues),
        medianEngagementRate: engagementRates.length > 0
          ? Math.round(calcMedian(engagementRates.map((r) => Math.round(r * 10000))) / 100)
          : null,
      },
    });
  }

  return NextResponse.json({
    benchmark: benchmarkResults,
    period: { days, since: since.toISOString() },
  });
}) as unknown as (req: Request) => Promise<Response>;
