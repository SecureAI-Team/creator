import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/openclaw";
import { NextResponse } from "next/server";

/**
 * POST /api/data/refresh
 * Trigger data pull from platforms via the desktop bridge, then store results.
 * Body: { platform?: "bilibili" } (optional, refreshes all if omitted)
 *
 * Flow:
 *   1. Send `/data refresh <platform>` to bridge → desktop → OpenClaw scraper
 *   2. Desktop returns structured metrics JSON
 *   3. Server stores metrics in PlatformMetrics (daily snapshots)
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json().catch(() => ({}));
  const platform = (body as Record<string, string>).platform;

  try {
    const command = platform
      ? `/data refresh ${platform}`
      : `/data refresh all`;

    const reply = await sendMessage(userId, command);

    // Try to parse the reply as structured data from the desktop collector
    let collectedData: Record<string, PlatformData> | null = null;
    try {
      const parsed = JSON.parse(reply);
      if (parsed.success && parsed.platforms) {
        collectedData = parsed.platforms;
      }
    } catch {
      // Reply was not JSON — might be a plain text response
    }

    // Store collected metrics in database
    const storedPlatforms: string[] = [];
    if (collectedData) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const [platformKey, data] of Object.entries(collectedData)) {
        if (!data.success) continue;

        try {
          await prisma.platformMetrics.upsert({
            where: {
              userId_platform_date: {
                userId,
                platform: platformKey,
                date: today,
              },
            },
            update: {
              followers: data.followers || 0,
              totalViews: data.totalViews || 0,
              totalLikes: data.totalLikes || 0,
              totalComments: data.totalComments || 0,
              totalShares: data.totalShares || 0,
              contentCount: data.contentCount || 0,
              rawData: data.rawData || null,
            },
            create: {
              userId,
              platform: platformKey,
              date: today,
              followers: data.followers || 0,
              totalViews: data.totalViews || 0,
              totalLikes: data.totalLikes || 0,
              totalComments: data.totalComments || 0,
              totalShares: data.totalShares || 0,
              contentCount: data.contentCount || 0,
              rawData: data.rawData || null,
            },
          });
          storedPlatforms.push(platformKey);
        } catch (err) {
          console.error(`[data/refresh] Failed to store metrics for ${platformKey}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: storedPlatforms.length > 0
        ? `已更新 ${storedPlatforms.join(", ")} 的数据`
        : reply,
      storedPlatforms,
      rawReply: collectedData ? undefined : reply,
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
  followers?: number;
  totalViews?: number;
  totalLikes?: number;
  totalComments?: number;
  totalShares?: number;
  contentCount?: number;
  rawData?: Record<string, unknown>;
  error?: string;
}
