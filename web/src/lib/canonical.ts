/**
 * Canonical metric normalization layer.
 *
 * Maps platform-specific raw collector data (PlatformMetrics / PlatformMetricsRaw)
 * into a unified CanonicalMetrics schema.
 */

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

interface RawCollectorData {
  followers?: number;
  totalViews?: number;
  totalLikes?: number;
  totalComments?: number;
  totalShares?: number;
  contentCount?: number;
  // Extended fields some platforms provide
  totalSaves?: number;
  totalFavorites?: number;
  watchTime?: number;
  exposure?: number;
  impressions?: number;
  plays?: number;
  completions?: number;
  clicks?: number;
  revenue?: number;
  [key: string]: unknown;
}

interface NormalizedRow {
  exposure: number;
  clicks: number;
  plays: number;
  completions: number;
  completionRate: number | null;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number | null;
  followers: number;
  followerDelta: number;
  contentCount: number;
  contentDelta: number;
  watchTime: number;
  revenue: number;
}

const VIDEO_PLATFORMS = new Set([
  "bilibili", "douyin", "kuaishou", "weixin-channels", "youtube", "toutiao",
]);

/**
 * Normalize raw collector output into the canonical schema.
 * Platform-specific mapping rules live here.
 */
export function normalizeMetrics(
  platform: string,
  raw: RawCollectorData,
  previousFollowers = 0,
  previousContentCount = 0
): NormalizedRow {
  const followers = raw.followers ?? 0;
  const views = raw.totalViews ?? 0;
  const likes = raw.totalLikes ?? 0;
  const comments = raw.totalComments ?? 0;
  const shares = raw.totalShares ?? 0;
  const contentCount = raw.contentCount ?? 0;
  const saves = raw.totalSaves ?? raw.totalFavorites ?? 0;
  const watchTime = raw.watchTime ?? 0;

  const exposure = raw.exposure ?? raw.impressions ?? 0;
  const clicks = raw.clicks ?? 0;
  const completions = raw.completions ?? 0;

  // For video platforms, "plays" = totalViews; for article platforms, "plays" = reads = totalViews
  const plays = raw.plays ?? views;

  const completionRate = plays > 0 && completions > 0 ? completions / plays : null;
  const denominator = Math.max(plays, 1);
  const engagementRate = (likes + comments + shares) / denominator;

  const followerDelta = previousFollowers > 0 ? followers - previousFollowers : 0;
  const contentDelta = previousContentCount > 0 ? contentCount - previousContentCount : 0;

  const revenue = typeof raw.revenue === "number" ? raw.revenue : 0;

  return {
    exposure,
    clicks,
    plays,
    completions,
    completionRate,
    likes,
    comments,
    shares,
    saves,
    engagementRate: Math.round(engagementRate * 10000) / 10000,
    followers,
    followerDelta,
    contentCount,
    contentDelta,
    watchTime,
    revenue,
  };
}

/**
 * Run normalization for a single user+platform+date and upsert into CanonicalMetrics.
 */
export async function normalizeAndStore(
  userId: string,
  platform: string,
  accountId: string,
  date: Date,
  raw: RawCollectorData
): Promise<void> {
  // Fetch previous day's canonical snapshot for delta calculations
  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);

  const previous = await prisma.canonicalMetrics.findUnique({
    where: {
      userId_platform_accountId_date: {
        userId,
        platform,
        accountId,
        date: prevDate,
      },
    },
    select: { followers: true, contentCount: true },
  });

  const normalized = normalizeMetrics(
    platform,
    raw,
    previous?.followers ?? 0,
    previous?.contentCount ?? 0
  );

  await prisma.canonicalMetrics.upsert({
    where: {
      userId_platform_accountId_date: { userId, platform, accountId, date },
    },
    update: {
      ...normalized,
      normalizedAt: new Date(),
    },
    create: {
      userId,
      platform,
      accountId,
      date,
      ...normalized,
    },
  });
}

/**
 * Batch-normalize all PlatformMetrics rows for a user that don't yet have
 * a corresponding CanonicalMetrics entry (backfill).
 */
export async function backfillCanonical(userId: string): Promise<number> {
  const metrics = await prisma.platformMetrics.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  let count = 0;
  for (const m of metrics) {
    const existing = await prisma.canonicalMetrics.findUnique({
      where: {
        userId_platform_accountId_date: {
          userId,
          platform: m.platform,
          accountId: m.accountId,
          date: m.date,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      const raw: RawCollectorData = {
        followers: m.followers,
        totalViews: m.totalViews,
        totalLikes: m.totalLikes,
        totalComments: m.totalComments,
        totalShares: m.totalShares,
        contentCount: m.contentCount,
      };
      await normalizeAndStore(userId, m.platform, m.accountId, m.date, raw);
      count++;
    }
  }

  return count;
}
