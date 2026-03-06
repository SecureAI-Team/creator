import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/content/performance
 * Cross-platform content performance analysis.
 *
 * Returns content items with their per-platform performance metrics,
 * enabling comparison of the same topic across different platforms.
 *
 * Query params:
 *   - page (default 1)
 *   - pageSize (default 20)
 *   - sort ("views" | "likes" | "engagement", default "views")
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20", 10), 50);
  const sort = searchParams.get("sort") || "views";

  const items = await prisma.contentItem.findMany({
    where: { userId },
    include: {
      contentPerformance: {
        orderBy: { views: "desc" },
      },
      publishRecords: {
        select: {
          platform: true,
          accountId: true,
          status: true,
          platformUrl: true,
          views: true,
          likes: true,
          comments: true,
          shares: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const total = await prisma.contentItem.count({ where: { userId } });

  // Build cross-platform comparison for each content item
  const results = items.map((item) => {
    // Merge ContentPerformance with PublishRecord fallback
    const platformMetrics: Record<string, {
      platform: string;
      views: number;
      likes: number;
      comments: number;
      shares: number;
      saves: number;
      engagementRate: number | null;
      platformUrl: string | null;
      source: "performance" | "publish_record";
    }> = {};

    // Prefer ContentPerformance data
    for (const cp of item.contentPerformance) {
      platformMetrics[`${cp.platform}:${cp.accountId}`] = {
        platform: cp.platform,
        views: cp.views,
        likes: cp.likes,
        comments: cp.comments,
        shares: cp.shares,
        saves: cp.saves,
        engagementRate: cp.engagementRate,
        platformUrl: cp.platformUrl,
        source: "performance",
      };
    }

    // Fill in from PublishRecord where ContentPerformance is missing
    for (const pr of item.publishRecords) {
      const key = `${pr.platform}:${pr.accountId}`;
      if (!platformMetrics[key] && pr.status === "PUBLISHED") {
        const totalEngagement = pr.views > 0 ? (pr.likes + pr.comments + pr.shares) / pr.views : null;
        platformMetrics[key] = {
          platform: pr.platform,
          views: pr.views,
          likes: pr.likes,
          comments: pr.comments,
          shares: pr.shares,
          saves: 0,
          engagementRate: totalEngagement,
          platformUrl: pr.platformUrl,
          source: "publish_record",
        };
      }
    }

    const allPlatforms = Object.values(platformMetrics);
    const totalViews = allPlatforms.reduce((s, p) => s + p.views, 0);
    const totalLikes = allPlatforms.reduce((s, p) => s + p.likes, 0);
    const totalComments = allPlatforms.reduce((s, p) => s + p.comments, 0);
    const totalShares = allPlatforms.reduce((s, p) => s + p.shares, 0);

    return {
      id: item.id,
      title: item.title,
      contentType: item.contentType,
      status: item.status,
      platforms: allPlatforms,
      totals: {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        engagementRate: totalViews > 0 ? (totalLikes + totalComments + totalShares) / totalViews : null,
      },
      platformCount: allPlatforms.length,
      createdAt: item.createdAt,
    };
  });

  // Sort
  if (sort === "likes") {
    results.sort((a, b) => b.totals.likes - a.totals.likes);
  } else if (sort === "engagement") {
    results.sort((a, b) => (b.totals.engagementRate ?? 0) - (a.totals.engagementRate ?? 0));
  } else {
    results.sort((a, b) => b.totals.views - a.totals.views);
  }

  return NextResponse.json({
    items: results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}) as unknown as (req: Request) => Promise<Response>;
