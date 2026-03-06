import { prisma } from "@/lib/db";
import { sendViaBridge } from "@/lib/bridge";
import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * GET /api/cron/publish-scheduler
 * Called by cron to execute due scheduled publications.
 * Protected by CRON_SECRET token (passed as ?token= or Authorization header).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  if (CRON_SECRET) {
    const token =
      request.nextUrl.searchParams.get("token") ||
      request.headers.get("authorization")?.replace("Bearer ", "");
    if (token !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const dueRecords = await prisma.publishRecord.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: new Date() },
      },
      include: {
        contentItem: true,
      },
    });

    if (dueRecords.length === 0) {
      return NextResponse.json({ message: "No scheduled publications due", count: 0 });
    }

    let published = 0;
    let failed = 0;

    for (const record of dueRecords) {
      const content = record.contentItem;

      // Mark as PUBLISHING
      await prisma.publishRecord.update({
        where: { id: record.id },
        data: { status: "PUBLISHING" },
      });
      await prisma.contentItem.update({
        where: { id: content.id },
        data: { status: "PUBLISHING" },
      });

      // Use adapted content if available
      const adaptation = await prisma.contentAdaptation.findUnique({
        where: { contentId_platform: { contentId: content.id, platform: record.platform } },
      });

      const publishPayload = JSON.stringify({
        platform: record.platform,
        accountId: record.accountId,
        contentId: content.id,
        title: adaptation?.title || content.title,
        body: adaptation?.body || content.body || "",
        mediaUrl: content.mediaUrl || "",
        coverUrl: adaptation?.coverUrl || content.coverUrl || "",
        tags: adaptation?.tags?.length ? adaptation.tags : (content.tags || []),
        contentType: content.contentType,
      });

      try {
        const result = await sendViaBridge(content.userId, `/publish ${publishPayload}`, 120_000);
        if (result.ok) {
          let reply: { success?: boolean; platformUrl?: string; error?: string } = {};
          try { reply = JSON.parse(result.reply || "{}"); } catch { /* ignore */ }
          await prisma.publishRecord.update({
            where: { id: record.id },
            data: {
              status: reply.success !== false ? "PUBLISHED" : "FAILED",
              platformUrl: reply.platformUrl || null,
              publishedAt: reply.success !== false ? new Date() : null,
              errorMessage: reply.error || null,
            },
          });
          if (reply.success !== false) published++; else failed++;
        } else {
          await prisma.publishRecord.update({
            where: { id: record.id },
            data: { status: "FAILED", errorMessage: result.error || "Bridge 通信失败" },
          });
          failed++;
        }
      } catch {
        await prisma.publishRecord.update({
          where: { id: record.id },
          data: { status: "FAILED", errorMessage: "定时发布执行异常" },
        }).catch(() => {});
        failed++;
      }

      // Update content status
      const allRecords = await prisma.publishRecord.findMany({ where: { contentItemId: content.id } });
      const allDone = allRecords.every((r) => r.status === "PUBLISHED" || r.status === "FAILED");
      if (allDone) {
        const anyPublished = allRecords.some((r) => r.status === "PUBLISHED");
        await prisma.contentItem.update({
          where: { id: content.id },
          data: { status: anyPublished ? "PUBLISHED" : "FAILED" },
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${dueRecords.length} scheduled publications`,
      published,
      failed,
    });
  } catch (error) {
    console.error("[publish-scheduler] Error:", error);
    return NextResponse.json({ error: "Scheduler error" }, { status: 500 });
  }
}
