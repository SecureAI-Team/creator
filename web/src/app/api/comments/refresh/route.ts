import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendViaBridge } from "@/lib/bridge";
import { NextResponse } from "next/server";

interface CommentFromBridge {
  platform?: string;
  author: string;
  body: string;
  time?: string;
}

interface PlatformCommentResult {
  success: boolean;
  comments?: CommentFromBridge[];
  error?: string;
}

/**
 * POST /api/comments/refresh
 * Trigger comment collection via the desktop bridge, then persist to Comment model.
 * Body: { platform?: string, accountId?: string } — optional; if platform omitted, collects from all platforms (default account only).
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  let body: { platform?: string; accountId?: string } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    // no body
  }

  const accountId = body.accountId || "default";
  let command = "/comments";
  if (body.platform) {
    command += ` ${body.platform}`;
    if (accountId !== "default") command += ` ${accountId}`;
  }

  try {
    const result = await sendViaBridge(userId, command, 120_000);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || "评论采集失败" },
        { status: 500 }
      );
    }

    let parsed: { success?: boolean; results?: Record<string, PlatformCommentResult>; comments?: CommentFromBridge[] } = {};
    try {
      parsed = JSON.parse(result.reply || "{}");
    } catch {
      return NextResponse.json(
        { success: false, error: "无法解析桌面端返回" },
        { status: 500 }
      );
    }

    const toCreate: { userId: string; platform: string; accountId: string; author: string; body: string; commentedAt: Date }[] = [];
    const platformsRefreshed: string[] = [];

    // Single-platform response: { success, comments: [...] }
    if (Array.isArray(parsed.comments)) {
      const platform = body.platform || "unknown";
      platformsRefreshed.push(platform);
      for (const c of parsed.comments) {
        toCreate.push({
          userId,
          platform,
          accountId,
          author: c.author || "未知",
          body: (c.body || "").slice(0, 8000),
          commentedAt: new Date(),
        });
      }
    }

    // All-platform response: { success, results: { bilibili: { success, comments }, ... } }
    if (parsed.results) {
      for (const [platform, platformResult] of Object.entries(parsed.results)) {
        if (!platformResult?.success || !Array.isArray(platformResult.comments)) continue;
        platformsRefreshed.push(platform);
        for (const c of platformResult.comments) {
          toCreate.push({
            userId,
            platform,
            accountId: "default",
            author: c.author || "未知",
            body: (c.body || "").slice(0, 8000),
            commentedAt: new Date(),
          });
        }
      }
    }

    if (platformsRefreshed.length > 0) {
      const deleteWhere =
        body.platform
          ? { userId, platform: body.platform, accountId }
          : { userId, platform: { in: platformsRefreshed }, accountId: "default" };
      await prisma.comment.deleteMany({ where: deleteWhere });
    }
    if (toCreate.length > 0) {
      await prisma.comment.createMany({
        data: toCreate,
      });
    }

    return NextResponse.json({
      success: true,
      count: toCreate.length,
      platforms: platformsRefreshed,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}) as unknown as (req: Request) => Promise<Response>;
