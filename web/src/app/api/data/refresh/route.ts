import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/openclaw";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

/**
 * All platform keys that have data collectors on the desktop side.
 * When refreshing "all", we try every one of these — the desktop's
 * cookie check will skip platforms the user isn't logged into.
 */
const ALL_COLLECTOR_PLATFORMS = [
  "douyin",
  "bilibili",
  "xiaohongshu",
  "weixin-mp",
  "weixin-channels",
  "kuaishou",
  "zhihu",
];

/**
 * POST /api/data/refresh
 * Trigger data pull from platforms via the desktop bridge, then store results.
 * Body: { platform?: "bilibili", accountId?: "default" }
 *
 * When refreshing ALL platforms (no specific platform requested), we try every
 * known collector platform — not just those with PlatformConnection records.
 * The desktop-side cookie check skips platforms the user isn't logged into,
 * and we auto-create PlatformConnection records when data is successfully collected.
 *
 * Iterates per-platform and saves data immediately after each one completes,
 * so earlier results are not lost if later platforms timeout or fail.
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json().catch(() => ({}));
  const requestedPlatform = (body as Record<string, string>).platform;
  const accountId = (body as Record<string, string>).accountId || "default";

  try {
    // Look up existing platform connections for context
    const connections = await prisma.platformConnection.findMany({
      where: { userId },
      select: { platformKey: true, accountId: true, accountName: true },
    });

    // Build target list: all known platforms for "refresh all",
    // or the specific requested platform + accountId.
    type TargetAccount = { platformKey: string; accountId: string; accountName?: string | null };
    let targetAccounts: TargetAccount[];

    if (requestedPlatform) {
      // Specific platform requested — check if we have a connection
      const existing = connections.find(
        (c) => c.platformKey === requestedPlatform && c.accountId === accountId
      );
      targetAccounts = [existing || { platformKey: requestedPlatform, accountId }];
    } else {
      // Refresh all — start with existing connections
      const seen = new Set(connections.map((c) => `${c.platformKey}:${c.accountId}`));
      targetAccounts = [...connections];
      // Add known collector platforms that don't have connections yet
      for (const pk of ALL_COLLECTOR_PLATFORMS) {
        const key = `${pk}:default`;
        if (!seen.has(key)) {
          targetAccounts.push({ platformKey: pk, accountId: "default" });
          seen.add(key);
        }
      }
    }

    if (targetAccounts.length === 0) {
      return NextResponse.json({
        success: false,
        message: "没有可采集的平台",
        storedPlatforms: [],
      });
    }

    console.log(`[data/refresh] Collecting from ${targetAccounts.length} account(s): ${targetAccounts.map((c) => `${c.platformKey}:${c.accountId}`).join(", ")}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const storedPlatforms: string[] = [];
    const errors: string[] = [];

    // Iterate per-account, collect and save immediately
    // Each account may use a different browser profile for cookie isolation
    for (const conn of targetAccounts) {
      const platformKey = conn.platformKey;
      const acctId = conn.accountId;
      const label = acctId === "default" ? platformKey : `${platformKey}:${acctId}`;

      try {
        console.log(`[data/refresh] Starting ${label}...`);
        // Include accountId in the command so the desktop uses the right browser profile
        const command = `/data refresh ${platformKey} ${acctId}`;

        // Per-account timeout: 5 minutes
        // Each platform collection involves 2 navigations + waitForContent polls,
        // which can take 2-3 minutes in the exe environment.
        const reply = await sendMessage(userId, command, 300_000);

        // Parse the reply
        let platformData: PlatformData | null = null;
        try {
          const parsed = JSON.parse(reply);
          if (parsed.success && parsed.platforms) {
            platformData = parsed.platforms[platformKey] || null;
          }
        } catch {
          // Reply was not JSON
        }

        if (platformData && platformData.success) {
          // Save metrics immediately to database
          await prisma.platformMetrics.upsert({
            where: {
              userId_platform_accountId_date: {
                userId,
                platform: platformKey,
                accountId: acctId,
                date: today,
              },
            },
            update: {
              followers: platformData.followers || 0,
              totalViews: platformData.totalViews || 0,
              totalLikes: platformData.totalLikes || 0,
              totalComments: platformData.totalComments || 0,
              totalShares: platformData.totalShares || 0,
              contentCount: platformData.contentCount || 0,
              rawData: (platformData.rawData as Prisma.InputJsonValue) ?? undefined,
            },
            create: {
              userId,
              platform: platformKey,
              accountId: acctId,
              date: today,
              followers: platformData.followers || 0,
              totalViews: platformData.totalViews || 0,
              totalLikes: platformData.totalLikes || 0,
              totalComments: platformData.totalComments || 0,
              totalShares: platformData.totalShares || 0,
              contentCount: platformData.contentCount || 0,
              rawData: (platformData.rawData as Prisma.InputJsonValue) ?? undefined,
            },
          });

          // Auto-create PlatformConnection if it doesn't exist
          // so subsequent refreshes and the dashboard know about this platform
          await prisma.platformConnection.upsert({
            where: {
              userId_platformKey_accountId: { userId, platformKey, accountId: acctId },
            },
            update: {
              status: "CONNECTED",
              lastChecked: new Date(),
            },
            create: {
              userId,
              platformKey,
              accountId: acctId,
              status: "CONNECTED",
              lastChecked: new Date(),
            },
          });

          storedPlatforms.push(label);
          console.log(`[data/refresh] Saved ${label} (followers=${platformData.followers}, views=${platformData.totalViews})`);
        } else {
          const errMsg = platformData?.error || "采集结果为空";
          errors.push(`${label}: ${errMsg}`);
          console.log(`[data/refresh] ${label} failed: ${errMsg}`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${label}: ${errMsg}`);
        console.error(`[data/refresh] ${label} error:`, errMsg);
        // Continue to next account — don't let one failure stop the rest
      }
    }

    // Build summary message
    const parts: string[] = [];
    if (storedPlatforms.length > 0) {
      parts.push(`已更新: ${storedPlatforms.join(", ")}`);
    }
    if (errors.length > 0) {
      parts.push(`失败: ${errors.join("; ")}`);
    }

    return NextResponse.json({
      success: storedPlatforms.length > 0,
      message: parts.join("。") || "没有采集到数据",
      storedPlatforms,
      errors,
    });
  } catch (error) {
    console.error("[data/refresh] Error:", error);
    return NextResponse.json(
      { error: "Failed to trigger data refresh" },
      { status: 500 }
    );
  }
}) as unknown as (req: Request) => Promise<Response>;

// Type for platform data from the desktop collector
interface PlatformData {
  success: boolean;
  accountId?: string;
  followers?: number;
  totalViews?: number;
  totalLikes?: number;
  totalComments?: number;
  totalShares?: number;
  contentCount?: number;
  rawData?: Record<string, unknown>;
  error?: string;
}
