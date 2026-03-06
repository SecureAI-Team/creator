import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import type { InsightSeverity, Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Platform-specific title length limits (chars)
// ---------------------------------------------------------------------------
const TITLE_LIMITS: Record<string, { min: number; max: number }> = {
  bilibili: { min: 5, max: 80 },
  douyin: { min: 5, max: 55 },
  xiaohongshu: { min: 5, max: 20 },
  "weixin-mp": { min: 5, max: 64 },
  "weixin-channels": { min: 5, max: 30 },
  kuaishou: { min: 5, max: 50 },
  zhihu: { min: 5, max: 100 },
  weibo: { min: 1, max: 140 },
  toutiao: { min: 5, max: 50 },
};

// Best publish hours per platform (local time, 24h)
const PEAK_HOURS: Record<string, number[]> = {
  bilibili: [11, 12, 17, 18, 19, 20, 21, 22],
  douyin: [12, 13, 18, 19, 20, 21, 22],
  xiaohongshu: [7, 8, 12, 13, 18, 19, 20, 21],
  "weixin-mp": [7, 8, 12, 17, 18, 20, 21, 22],
  "weixin-channels": [12, 18, 19, 20, 21, 22],
  kuaishou: [12, 18, 19, 20, 21, 22],
  zhihu: [9, 10, 11, 12, 20, 21, 22, 23],
  weibo: [8, 9, 12, 18, 21, 22],
  toutiao: [7, 8, 12, 18, 19, 20, 21],
};

interface InsightCandidate {
  type: string;
  severity: InsightSeverity;
  platform?: string;
  message: string;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Rule runners
// ---------------------------------------------------------------------------

async function runTitleLengthRule(userId: string): Promise<InsightCandidate[]> {
  const items = await prisma.contentItem.findMany({
    where: { userId, status: { not: "DRAFT" } },
    select: { id: true, title: true, platforms: true },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });

  const insights: InsightCandidate[] = [];
  for (const item of items) {
    for (const platform of item.platforms) {
      const limits = TITLE_LIMITS[platform];
      if (!limits) continue;
      const len = item.title.length;
      if (len > limits.max) {
        insights.push({
          type: "title_too_long",
          severity: "WARNING",
          platform,
          message: `「${item.title.slice(0, 20)}…」标题长度 ${len} 字，超出${platform}限制(${limits.max}字)，可能被截断`,
          data: { contentId: item.id, titleLength: len, limit: limits.max },
        });
      } else if (len < limits.min) {
        insights.push({
          type: "title_too_short",
          severity: "INFO",
          platform,
          message: `「${item.title}」标题长度 ${len} 字，低于${platform}推荐(${limits.min}字)，建议补充关键词提升搜索发现`,
          data: { contentId: item.id, titleLength: len, limit: limits.min },
        });
      }
    }
  }
  return insights;
}

async function runPublishTimingRule(userId: string): Promise<InsightCandidate[]> {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const records = await prisma.publishRecord.findMany({
    where: {
      contentItem: { userId },
      status: "PUBLISHED",
      publishedAt: { gte: since },
    },
    select: { platform: true, publishedAt: true },
  });

  const offPeakPlatforms = new Map<string, number>();
  for (const r of records) {
    if (!r.publishedAt) continue;
    const hour = r.publishedAt.getHours();
    const peakHours = PEAK_HOURS[r.platform];
    if (peakHours && !peakHours.includes(hour)) {
      offPeakPlatforms.set(r.platform, (offPeakPlatforms.get(r.platform) || 0) + 1);
    }
  }

  const insights: InsightCandidate[] = [];
  for (const [platform, count] of offPeakPlatforms.entries()) {
    if (count >= 2) {
      const peakStr = PEAK_HOURS[platform]
        ?.map((h) => `${h}:00`)
        .join("、") || "未知";
      insights.push({
        type: "off_peak_publish",
        severity: "INFO",
        platform,
        message: `近两周有 ${count} 篇内容在非高峰时段发布到${platform}。推荐发布时间: ${peakStr}`,
        data: { offPeakCount: count, peakHours: PEAK_HOURS[platform] },
      });
    }
  }
  return insights;
}

async function runEngagementAnomalyRule(userId: string): Promise<InsightCandidate[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const metrics = await prisma.platformMetrics.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const byPlatform = new Map<string, typeof metrics>();
  for (const m of metrics) {
    const key = `${m.platform}:${m.accountId}`;
    if (!byPlatform.has(key)) byPlatform.set(key, []);
    byPlatform.get(key)!.push(m);
  }

  const insights: InsightCandidate[] = [];
  for (const [key, arr] of byPlatform.entries()) {
    if (arr.length < 3) continue;
    const platform = arr[0].platform;

    // Follower growth stagnation / decline
    const latest = arr[arr.length - 1];
    const oldest = arr[0];
    const followerDelta = latest.followers - oldest.followers;
    if (followerDelta < 0 && Math.abs(followerDelta) > oldest.followers * 0.05) {
      insights.push({
        type: "follower_decline",
        severity: "WARNING",
        platform,
        message: `${platform} 粉丝数在过去 ${arr.length} 天下降了 ${Math.abs(followerDelta)}，请检查内容策略或账号状态`,
        data: { key, followerDelta, days: arr.length },
      });
    } else if (followerDelta === 0 && arr.length >= 7) {
      insights.push({
        type: "follower_stagnation",
        severity: "INFO",
        platform,
        message: `${platform} 粉丝数已连续 ${arr.length} 天无增长，建议增加曝光渠道`,
        data: { key, days: arr.length },
      });
    }

    // Zero engagement for N consecutive days
    const recentZeros = arr.slice(-7).filter(
      (m) => m.totalViews === 0 && m.totalLikes === 0 && m.totalComments === 0
    );
    if (recentZeros.length >= 3) {
      insights.push({
        type: "zero_engagement",
        severity: "CRITICAL",
        platform,
        message: `${platform} 近 7 天有 ${recentZeros.length} 天无任何互动数据，可能存在账号异常或登录过期`,
        data: { key, zeroDays: recentZeros.length },
      });
    }
  }
  return insights;
}

async function runAdaptationGapRule(userId: string): Promise<InsightCandidate[]> {
  const items = await prisma.contentItem.findMany({
    where: { userId, status: { not: "DRAFT" } },
    select: { id: true, title: true, platforms: true },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });

  if (items.length === 0) return [];

  const contentIds = items.map((i) => i.id);
  const adaptations = await prisma.contentAdaptation.findMany({
    where: { contentId: { in: contentIds } },
    select: { contentId: true, platform: true },
  });

  const adaptedSet = new Set(adaptations.map((a) => `${a.contentId}:${a.platform}`));
  const insights: InsightCandidate[] = [];

  for (const item of items) {
    const missing = item.platforms.filter((p) => !adaptedSet.has(`${item.id}:${p}`));
    if (missing.length > 0 && item.platforms.length > 1) {
      insights.push({
        type: "no_adaptation",
        severity: "WARNING",
        message: `「${item.title.slice(0, 20)}…」尚未针对 ${missing.join("、")} 创建平台适配版本，可能影响各平台的最佳展示效果`,
        data: { contentId: item.id, missingPlatforms: missing },
      });
    }
  }
  return insights;
}

// ---------------------------------------------------------------------------
// Additional diagnostic rules
// ---------------------------------------------------------------------------

const BODY_LIMITS: Record<string, { min: number; max: number }> = {
  bilibili: { min: 50, max: 10000 },
  douyin: { min: 10, max: 1000 },
  xiaohongshu: { min: 100, max: 1000 },
  "weixin-mp": { min: 300, max: 25000 },
  "weixin-channels": { min: 10, max: 1000 },
  kuaishou: { min: 10, max: 1000 },
  zhihu: { min: 300, max: 30000 },
  weibo: { min: 10, max: 2000 },
  toutiao: { min: 200, max: 20000 },
};

const HASHTAG_LIMITS: Record<string, { min: number; max: number }> = {
  bilibili: { min: 1, max: 10 },
  douyin: { min: 2, max: 8 },
  xiaohongshu: { min: 3, max: 15 },
  "weixin-mp": { min: 0, max: 5 },
  "weixin-channels": { min: 1, max: 5 },
  kuaishou: { min: 1, max: 8 },
  zhihu: { min: 1, max: 5 },
  weibo: { min: 1, max: 9 },
  toutiao: { min: 1, max: 5 },
};

async function runContentLengthRule(userId: string): Promise<InsightCandidate[]> {
  const items = await prisma.contentItem.findMany({
    where: { userId, status: { not: "DRAFT" } },
    select: { id: true, title: true, body: true, platforms: true },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });

  const insights: InsightCandidate[] = [];
  for (const item of items) {
    const bodyLen = item.body?.length ?? 0;
    for (const platform of item.platforms) {
      const limits = BODY_LIMITS[platform];
      if (!limits) continue;
      if (bodyLen > 0 && bodyLen < limits.min) {
        insights.push({
          type: "body_too_short",
          severity: "INFO",
          platform,
          message: `「${item.title.slice(0, 20)}…」正文 ${bodyLen} 字，低于${platform}建议最少 ${limits.min} 字`,
          data: { contentId: item.id, bodyLength: bodyLen, limit: limits.min },
        });
      } else if (bodyLen > limits.max) {
        insights.push({
          type: "body_too_long",
          severity: "WARNING",
          platform,
          message: `「${item.title.slice(0, 20)}…」正文 ${bodyLen} 字，超出${platform}建议上限 ${limits.max} 字`,
          data: { contentId: item.id, bodyLength: bodyLen, limit: limits.max },
        });
      }
    }
  }
  return insights;
}

async function runHashtagCountRule(userId: string): Promise<InsightCandidate[]> {
  const items = await prisma.contentItem.findMany({
    where: { userId, status: { not: "DRAFT" } },
    select: { id: true, title: true, tags: true, platforms: true },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });

  const insights: InsightCandidate[] = [];
  for (const item of items) {
    const tagCount = item.tags?.length ?? 0;
    for (const platform of item.platforms) {
      const limits = HASHTAG_LIMITS[platform];
      if (!limits) continue;
      if (tagCount < limits.min) {
        insights.push({
          type: "too_few_hashtags",
          severity: "INFO",
          platform,
          message: `「${item.title.slice(0, 20)}…」仅有 ${tagCount} 个标签，${platform}建议至少 ${limits.min} 个，可提升发现率`,
          data: { contentId: item.id, tagCount, limit: limits.min },
        });
      } else if (tagCount > limits.max) {
        insights.push({
          type: "too_many_hashtags",
          severity: "INFO",
          platform,
          message: `「${item.title.slice(0, 20)}…」有 ${tagCount} 个标签，超出${platform}推荐上限 ${limits.max} 个`,
          data: { contentId: item.id, tagCount, limit: limits.max },
        });
      }
    }
  }
  return insights;
}

async function runContentFatigueRule(userId: string): Promise<InsightCandidate[]> {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const recentItems = await prisma.contentItem.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { title: true, tags: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (recentItems.length < 3) return [];

  // Detect tag repetition (same tag used in >60% of recent content)
  const tagCounts = new Map<string, number>();
  for (const item of recentItems) {
    for (const tag of item.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const insights: InsightCandidate[] = [];
  const threshold = Math.max(3, Math.ceil(recentItems.length * 0.6));
  for (const [tag, count] of tagCounts) {
    if (count >= threshold) {
      insights.push({
        type: "content_fatigue",
        severity: "WARNING",
        message: `近两周 ${recentItems.length} 篇内容中有 ${count} 篇使用了「${tag}」标签，受众可能产生内容疲劳，建议拓展新话题`,
        data: { tag, count, total: recentItems.length },
      });
    }
  }

  return insights;
}

async function runFollowerAnomalyRule(userId: string): Promise<InsightCandidate[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const metrics = await prisma.platformMetrics.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const byPlatform = new Map<string, typeof metrics>();
  for (const m of metrics) {
    const key = `${m.platform}:${m.accountId}`;
    if (!byPlatform.has(key)) byPlatform.set(key, []);
    byPlatform.get(key)!.push(m);
  }

  const insights: InsightCandidate[] = [];

  for (const [, arr] of byPlatform.entries()) {
    if (arr.length < 3) continue;
    const platform = arr[0].platform;

    // Day-over-day spike detection
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1].followers;
      const curr = arr[i].followers;
      if (prev > 100) {
        const delta = curr - prev;
        const rate = delta / prev;
        if (rate > 0.1) {
          insights.push({
            type: "follower_spike",
            severity: "INFO",
            platform,
            message: `${platform} 在 ${arr[i].date.toISOString().substring(0, 10)} 粉丝突增 ${delta} (+${(rate * 100).toFixed(1)}%)，可能有爆款内容或外部曝光`,
            data: { platform, date: arr[i].date.toISOString(), delta, rate },
          });
          break;
        } else if (rate < -0.05) {
          insights.push({
            type: "follower_sudden_drop",
            severity: "CRITICAL",
            platform,
            message: `${platform} 在 ${arr[i].date.toISOString().substring(0, 10)} 粉丝骤降 ${Math.abs(delta)} (-${(Math.abs(rate) * 100).toFixed(1)}%)，请检查账号安全`,
            data: { platform, date: arr[i].date.toISOString(), delta, rate },
          });
          break;
        }
      }
    }
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Statistical insight rules (Layer 2)
// ---------------------------------------------------------------------------

async function runRollingAverageRule(userId: string): Promise<InsightCandidate[]> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const metrics = await prisma.platformMetrics.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const byPlatform = new Map<string, typeof metrics>();
  for (const m of metrics) {
    const key = `${m.platform}:${m.accountId}`;
    if (!byPlatform.has(key)) byPlatform.set(key, []);
    byPlatform.get(key)!.push(m);
  }

  const insights: InsightCandidate[] = [];

  for (const [, arr] of byPlatform.entries()) {
    if (arr.length < 14) continue;
    const platform = arr[0].platform;

    // 7-day vs 30-day rolling average comparison for views
    const last7 = arr.slice(-7);
    const last30 = arr.slice(-30);

    const avg7Views = last7.reduce((s, m) => s + m.totalViews, 0) / last7.length;
    const avg30Views = last30.reduce((s, m) => s + m.totalViews, 0) / last30.length;

    if (avg30Views > 0) {
      const changeRate = (avg7Views - avg30Views) / avg30Views;

      if (changeRate < -0.3) {
        insights.push({
          type: "views_declining",
          severity: "WARNING",
          platform,
          message: `${platform} 近 7 天均浏览量(${Math.round(avg7Views)})较 30 天均值(${Math.round(avg30Views)})下降了 ${Math.abs(Math.round(changeRate * 100))}%，建议调整内容策略`,
          data: { avg7Views: Math.round(avg7Views), avg30Views: Math.round(avg30Views), changeRate },
        });
      } else if (changeRate > 0.5) {
        insights.push({
          type: "views_surging",
          severity: "INFO",
          platform,
          message: `${platform} 近 7 天均浏览量飙升 ${Math.round(changeRate * 100)}%，当前势头良好，建议保持更新频率`,
          data: { avg7Views: Math.round(avg7Views), avg30Views: Math.round(avg30Views), changeRate },
        });
      }
    }

    // Engagement rate trend (likes+comments) / views
    const calcER = (slice: typeof arr) => {
      const totalViews = slice.reduce((s, m) => s + m.totalViews, 0);
      const totalInteract = slice.reduce((s, m) => s + m.totalLikes + m.totalComments, 0);
      return totalViews > 0 ? totalInteract / totalViews : 0;
    };

    const er7 = calcER(last7);
    const er30 = calcER(last30);

    if (er30 > 0 && er7 < er30 * 0.5 && arr.length >= 14) {
      insights.push({
        type: "engagement_rate_drop",
        severity: "WARNING",
        platform,
        message: `${platform} 互动率近期大幅下降 (7日: ${(er7 * 100).toFixed(2)}%, 30日: ${(er30 * 100).toFixed(2)}%)，内容可能需要更新调整`,
        data: { er7, er30 },
      });
    }
  }

  return insights;
}

async function runHistoricalComparisonRule(userId: string): Promise<InsightCandidate[]> {
  const insights: InsightCandidate[] = [];

  // Compare content performance: find items with same topic/tags
  const recentItems = await prisma.contentItem.findMany({
    where: { userId, status: "PUBLISHED" },
    select: { id: true, title: true, tags: true, platforms: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (recentItems.length < 2) return insights;

  const contentIds = recentItems.map((i) => i.id);
  const performances = await prisma.contentPerformance.findMany({
    where: { contentItemId: { in: contentIds } },
    select: { contentItemId: true, platform: true, views: true, likes: true, comments: true },
  });

  const perfMap = new Map<string, { views: number; likes: number; comments: number }>();
  for (const p of performances) {
    const key = p.contentItemId;
    const existing = perfMap.get(key) || { views: 0, likes: 0, comments: 0 };
    perfMap.set(key, {
      views: existing.views + p.views,
      likes: existing.likes + p.likes,
      comments: existing.comments + p.comments,
    });
  }

  // Find underperforming content relative to user's own average
  const allPerfs = [...perfMap.values()].filter((p) => p.views > 0);
  if (allPerfs.length >= 3) {
    const avgViews = allPerfs.reduce((s, p) => s + p.views, 0) / allPerfs.length;
    const avgLikes = allPerfs.reduce((s, p) => s + p.likes, 0) / allPerfs.length;

    for (const item of recentItems.slice(0, 5)) {
      const perf = perfMap.get(item.id);
      if (perf && perf.views > 0 && perf.views < avgViews * 0.3) {
        insights.push({
          type: "underperforming_content",
          severity: "INFO",
          message: `「${item.title.slice(0, 20)}…」浏览量(${perf.views})远低于你的平均水平(${Math.round(avgViews)})，可考虑优化标题或重新分发`,
          data: { contentId: item.id, views: perf.views, avgViews: Math.round(avgViews) },
        });
      }
    }
  }

  return insights;
}

async function runFollowerGrowthRule(userId: string): Promise<InsightCandidate[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const metrics = await prisma.platformMetrics.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const byPlatform = new Map<string, typeof metrics>();
  for (const m of metrics) {
    const key = `${m.platform}:${m.accountId}`;
    if (!byPlatform.has(key)) byPlatform.set(key, []);
    byPlatform.get(key)!.push(m);
  }

  const insights: InsightCandidate[] = [];

  // Cross-platform comparison: which platform grows fastest?
  const growthRates: { platform: string; rate: number; delta: number }[] = [];

  for (const [, arr] of byPlatform.entries()) {
    if (arr.length < 7) continue;
    const platform = arr[0].platform;
    const first = arr[0].followers;
    const last = arr[arr.length - 1].followers;
    const delta = last - first;
    const rate = first > 0 ? delta / first : 0;
    growthRates.push({ platform, rate, delta });
  }

  if (growthRates.length >= 2) {
    growthRates.sort((a, b) => b.rate - a.rate);
    const best = growthRates[0];
    const worst = growthRates[growthRates.length - 1];

    if (best.rate > 0.01) {
      insights.push({
        type: "best_growth_platform",
        severity: "INFO",
        platform: best.platform,
        message: `${best.platform} 是近 30 天粉丝增长最快的平台 (+${best.delta}，增长率 ${(best.rate * 100).toFixed(1)}%)，建议加大此平台投入`,
        data: { platform: best.platform, delta: best.delta, rate: best.rate },
      });
    }

    if (worst.delta < 0) {
      insights.push({
        type: "worst_growth_platform",
        severity: "WARNING",
        platform: worst.platform,
        message: `${worst.platform} 近 30 天掉粉 ${Math.abs(worst.delta)}，建议检查内容方向和账号状态`,
        data: { platform: worst.platform, delta: worst.delta, rate: worst.rate },
      });
    }
  }

  return insights;
}

// ---------------------------------------------------------------------------
// API handler: generate + persist insights, or return existing ones
// ---------------------------------------------------------------------------

/**
 * GET /api/data/insights
 * Returns current non-dismissed insights for the user.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;

  const insights = await prisma.insightRecord.findMany({
    where: { userId, dismissed: false },
    orderBy: { generatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ insights });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * POST /api/data/insights
 * Re-generate insights by running all rules, replacing non-dismissed insights.
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;

  const [
    titleInsights, timingInsights, engagementInsights, adaptationInsights,
    contentLenInsights, hashtagInsights, fatigueInsights, followerAnomalyInsights,
    rollingAvgInsights, historicalInsights, followerGrowthInsights,
  ] = await Promise.all([
    runTitleLengthRule(userId),
    runPublishTimingRule(userId),
    runEngagementAnomalyRule(userId),
    runAdaptationGapRule(userId),
    runContentLengthRule(userId),
    runHashtagCountRule(userId),
    runContentFatigueRule(userId),
    runFollowerAnomalyRule(userId),
    runRollingAverageRule(userId),
    runHistoricalComparisonRule(userId),
    runFollowerGrowthRule(userId),
  ]);

  const allCandidates = [
    ...titleInsights,
    ...timingInsights,
    ...engagementInsights,
    ...adaptationInsights,
    ...contentLenInsights,
    ...hashtagInsights,
    ...fatigueInsights,
    ...followerAnomalyInsights,
    ...rollingAvgInsights,
    ...historicalInsights,
    ...followerGrowthInsights,
  ];

  // Delete old non-dismissed, non-expired insights to replace with fresh ones
  await prisma.insightRecord.deleteMany({
    where: { userId, dismissed: false },
  });

  if (allCandidates.length > 0) {
    await prisma.insightRecord.createMany({
      data: allCandidates.map((c) => ({
        userId,
        type: c.type,
        severity: c.severity,
        platform: c.platform || null,
        message: c.message,
        data: (c.data as Prisma.InputJsonValue) ?? undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 day TTL
      })),
    });
  }

  const insights = await prisma.insightRecord.findMany({
    where: { userId, dismissed: false },
    orderBy: { generatedAt: "desc" },
  });

  return NextResponse.json({
    generated: allCandidates.length,
    insights,
  });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * PATCH /api/data/insights
 * Dismiss an insight by ID.
 * Body: { id: string }
 */
export const PATCH = auth(async function PATCH(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json().catch(() => ({}));
  const insightId = (body as Record<string, string>).id;

  if (!insightId) {
    return NextResponse.json({ error: "Missing insight id" }, { status: 400 });
  }

  await prisma.insightRecord.updateMany({
    where: { id: insightId, userId },
    data: { dismissed: true },
  });

  return NextResponse.json({ success: true });
}) as unknown as (req: Request) => Promise<Response>;
