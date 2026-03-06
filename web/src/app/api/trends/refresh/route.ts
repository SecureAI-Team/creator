import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendViaBridge } from "@/lib/bridge";
import { NextResponse } from "next/server";

interface TrendItemFromBridge {
  rank: number;
  title: string;
  platform: string;
  heat: number;
}

interface PlatformResult {
  success: boolean;
  items?: TrendItemFromBridge[];
  error?: string;
}

/**
 * POST /api/trends/refresh
 * Trigger trend collection via the desktop bridge, then persist results.
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;

  try {
    const result = await sendViaBridge(userId, "/trends fetch", 120_000);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || "Trend collection failed" },
        { status: 500 }
      );
    }

    let parsed: { results?: Record<string, PlatformResult> } = {};
    try {
      parsed = JSON.parse(result.reply || "{}");
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse bridge response" },
        { status: 500 }
      );
    }

    const allItems: TrendItemFromBridge[] = [];
    if (parsed.results) {
      for (const [, platformResult] of Object.entries(parsed.results)) {
        if (platformResult.success && Array.isArray(platformResult.items)) {
          allItems.push(...platformResult.items);
        }
      }
    }

    if (allItems.length > 0) {
      const platforms = [...new Set(allItems.map((i) => i.platform))];
      await prisma.trend.deleteMany({
        where: { userId, platform: { in: platforms } },
      });

      await prisma.trend.createMany({
        data: allItems.map((item) => ({
          userId,
          platform: item.platform,
          rank: item.rank,
          title: item.title,
          heat: item.heat || 0,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      count: allItems.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}) as unknown as (req: Request) => Promise<Response>;
