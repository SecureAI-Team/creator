import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/openclaw";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

/**
 * POST /api/data/refresh
 * Trigger data pull from platforms via the desktop bridge, then store results.
 * Body: { platform?: "bilibili", accountId?: "default" }
 *
 * Key design: Only collects from platforms that have PlatformConnection records.
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
    // Step 1: Look up which platforms the user has configured
    const connections = await prisma.platformConnection.findMany({
      where: { userId },
      select: { platformKey: true, accountId: true, accountName: true },
    });

    if (connections.length === 0) {
      return NextResponse.json({
        success: false,
        message: "尚未连接任何平台，请先在设置中添加平台账号并登录",
        storedPlatforms: [],
      });
    }

    // Determine which accounts to collect from
    // Filter by requested platform if specified, and by specific accountId if specified
    let targetAccounts = connections;
    if (requestedPlatform) {
      targetAccounts = targetAccounts.filter((c) => c.platformKey === requestedPlatform);
    }
    if (accountId !== "default") {
      targetAccounts = targetAccounts.filter((c) => c.accountId === accountId);
    }

    if (targetAccounts.length === 0) {
      return NextResponse.json({
        success: false,
        message: requestedPlatform
          ? `平台 ${requestedPlatform} 尚未配置，请先在设置中添加`
          : "没有已配置的平台",
        storedPlatforms: [],
      });
    }

    console.log(`[data/refresh] Collecting from ${targetAccounts.length} account(s): ${targetAccounts.map((c) => `${c.platformKey}:${c.accountId}`).join(", ")}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const storedPlatforms: string[] = [];
    const errors: string[] = [];

    // Step 2: Iterate per-account, collect and save immediately
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
          // Save immediately to database
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

    // Step 3: Build summary message
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
