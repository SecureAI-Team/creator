import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendViaBridge } from "@/lib/bridge";
import { isWeChatNotifyEnabled, notifyPublishResult, type NotifyConfig } from "@/lib/wechat-notify";
import { NextRequest, NextResponse } from "next/server";

interface PublishTarget {
  platform: string;
  accountId?: string;
}

async function executePublish(
  contentId: string,
  userId: string,
  target: PublishTarget,
  content: { title: string; body: string | null; mediaUrl: string | null; coverUrl: string | null; tags: string[]; contentType: string },
) {
  const { platform, accountId = "default" } = target;

  // Use per-platform adapted content when available
  const adaptation = await prisma.contentAdaptation.findUnique({
    where: { contentId_platform: { contentId, platform } },
  });

  const publishPayload = JSON.stringify({
    platform,
    accountId,
    contentId,
    title: adaptation?.title || content.title,
    body: adaptation?.body || content.body || "",
    mediaUrl: content.mediaUrl || "",
    coverUrl: adaptation?.coverUrl || content.coverUrl || "",
    tags: adaptation?.tags?.length ? adaptation.tags : (content.tags || []),
    contentType: content.contentType,
  });

  let publishSuccess = false;
  let platformUrl: string | null = null;
  let platformPostId: string | null = null;

  try {
    const result = await sendViaBridge(userId, `/publish ${publishPayload}`, 120_000);
    if (result.ok) {
      try {
        const reply = JSON.parse(result.reply || "{}");
        publishSuccess = !!reply.success;
        platformUrl = reply.platformUrl || null;
        platformPostId = reply.platformPostId || null;
        await prisma.publishRecord.update({
          where: { contentItemId_platform_accountId: { contentItemId: contentId, platform, accountId } },
          data: {
            status: reply.success ? "PUBLISHED" : "FAILED",
            platformUrl: platformUrl,
            publishedAt: reply.success ? new Date() : null,
            errorMessage: reply.error || null,
          },
        });
      } catch {
        publishSuccess = true;
        await prisma.publishRecord.update({
          where: { contentItemId_platform_accountId: { contentItemId: contentId, platform, accountId } },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
      }
    } else {
      await prisma.publishRecord.update({
        where: { contentItemId_platform_accountId: { contentItemId: contentId, platform, accountId } },
        data: { status: "FAILED", errorMessage: result.error || "Bridge 通信失败" },
      });
    }
  } catch {
    await prisma.publishRecord.update({
      where: { contentItemId_platform_accountId: { contentItemId: contentId, platform, accountId } },
      data: { status: "FAILED", errorMessage: "发布请求异常" },
    }).catch(() => {});
  }

  // Create ContentPerformance record on successful publish
  if (publishSuccess) {
    await prisma.contentPerformance.upsert({
      where: { contentItemId_platform_accountId: { contentItemId: contentId, platform, accountId } },
      update: {
        platformUrl,
        platformPostId,
        fetchedAt: new Date(),
      },
      create: {
        userId,
        contentItemId: contentId,
        platform,
        accountId,
        platformUrl,
        platformPostId,
      },
    }).catch(() => {});
  }

  // Check if all records for this content are done
  const allRecords = await prisma.publishRecord.findMany({ where: { contentItemId: contentId } });
  const allDone = allRecords.every((r) => r.status === "PUBLISHED" || r.status === "FAILED");
  if (allDone) {
    const anyPublished = allRecords.some((r) => r.status === "PUBLISHED");
    await prisma.contentItem.update({
      where: { id: contentId },
      data: { status: anyPublished ? "PUBLISHED" : "FAILED" },
    });
  }

  // Fire-and-forget: WeChat notification for publish result
  if (isWeChatNotifyEnabled()) {
    const wechatAccount = await prisma.account
      .findFirst({ where: { userId, provider: "wechat" }, select: { providerAccountId: true } })
      .catch(() => null);

    if (wechatAccount) {
      const ci = await prisma.contentItem.findUnique({ where: { id: contentId }, select: { title: true } });
      const latestRecord = await prisma.publishRecord.findFirst({
        where: { contentItemId: contentId, platform },
        orderBy: { updatedAt: "desc" },
      });
      const config: NotifyConfig = {
        openId: wechatAccount.providerAccountId,
        baseUrl: process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL,
      };
      notifyPublishResult(config, {
        title: ci?.title || contentId,
        platform,
        success: latestRecord?.status === "PUBLISHED",
        error: latestRecord?.errorMessage || undefined,
      }).catch(() => {});
    }
  }
}

/**
 * POST /api/content/[id]/publish
 * Publish content to selected platforms via the desktop bridge.
 *
 * Body: { targets: [{platform, accountId?}], confirmed?, scheduledAt? }
 * Legacy: { platforms: ["bilibili"], confirmed? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: contentId } = await params;
    const body = await request.json();

    // Support both new `targets` format and legacy `platforms` array
    const targets: PublishTarget[] = body.targets
      ? body.targets
      : (body.platforms || []).map((p: string) => ({ platform: p }));
    const confirmed = body.confirmed;
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

    if (targets.length === 0) {
      return NextResponse.json({ error: "请选择至少一个平台" }, { status: 400 });
    }

    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { confirmBeforePublish: true },
    });
    const needsConfirmation = prefs?.confirmBeforePublish ?? true;

    if (needsConfirmation && !confirmed) {
      return NextResponse.json(
        { error: "NEEDS_CONFIRMATION", message: "当前为手动审核模式，请确认后再发布" },
        { status: 428 }
      );
    }

    const content = await prisma.contentItem.findFirst({ where: { id: contentId, userId } });
    if (!content) {
      return NextResponse.json({ error: "内容不存在" }, { status: 404 });
    }

    const isScheduled = scheduledAt && scheduledAt.getTime() > Date.now();

    // Create publish records
    const publishRecords = await Promise.all(
      targets.map((t) =>
        prisma.publishRecord.upsert({
          where: { contentItemId_platform_accountId: { contentItemId: contentId, platform: t.platform, accountId: t.accountId || "default" } },
          update: { status: isScheduled ? "SCHEDULED" : "PENDING", scheduledAt: isScheduled ? scheduledAt : null, errorMessage: null },
          create: { contentItemId: contentId, platform: t.platform, accountId: t.accountId || "default", status: isScheduled ? "SCHEDULED" : "PENDING", scheduledAt: isScheduled ? scheduledAt : null },
        })
      )
    );

    if (isScheduled) {
      return NextResponse.json({
        message: `已为 ${targets.length} 个平台设置定时发布`,
        scheduledAt,
        publishRecords,
      });
    }

    // Update content status to PUBLISHING
    await prisma.contentItem.update({ where: { id: contentId }, data: { status: "PUBLISHING" } });

    // Fire-and-forget publish for each target
    for (const t of targets) {
      executePublish(contentId, userId, t, content);
    }

    audit({
      userId,
      action: "publish",
      target: contentId,
      metadata: { platforms: targets.map((t) => t.platform), scheduled: !!isScheduled },
    });

    return NextResponse.json({
      message: `正在发布到 ${targets.length} 个平台`,
      publishRecords,
    });
  } catch (error) {
    console.error("[publish] Error:", error);
    return NextResponse.json({ error: "发布失败" }, { status: 500 });
  }
}
