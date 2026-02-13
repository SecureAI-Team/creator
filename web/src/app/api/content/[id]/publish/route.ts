import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendViaBridge } from "@/lib/bridge";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/content/[id]/publish
 * Publish content to selected platforms via the desktop bridge.
 *
 * Body: { platforms: ["bilibili", "douyin"] }
 *
 * 1. Verify content exists and belongs to current user
 * 2. Create PublishRecord for each platform (status=PENDING)
 * 3. Send /publish command to desktop via bridge
 * 4. Return publish records
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
    const { platforms } = await request.json();

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: "请选择至少一个平台" },
        { status: 400 }
      );
    }

    // Verify content exists and belongs to user
    const content = await prisma.contentItem.findFirst({
      where: { id: contentId, userId },
    });

    if (!content) {
      return NextResponse.json(
        { error: "内容不存在" },
        { status: 404 }
      );
    }

    // Create publish records for each platform
    const publishRecords = await Promise.all(
      platforms.map((platform: string) =>
        prisma.publishRecord.upsert({
          where: {
            contentItemId_platform: {
              contentItemId: contentId,
              platform,
            },
          },
          update: {
            status: "PENDING",
            errorMessage: null,
          },
          create: {
            contentItemId: contentId,
            platform,
            status: "PENDING",
          },
        })
      )
    );

    // Update content status to PUBLISHING
    await prisma.contentItem.update({
      where: { id: contentId },
      data: { status: "PUBLISHING" },
    });

    // Send publish commands to desktop via bridge (fire and forget for each platform)
    for (const platform of platforms) {
      const publishPayload = JSON.stringify({
        platform,
        contentId,
        title: content.title,
        body: content.body || "",
        mediaUrl: content.mediaUrl || "",
        coverUrl: content.coverUrl || "",
        tags: content.tags || [],
        contentType: content.contentType,
      });

      // Send via bridge — don't await completion (publishing is async)
      sendViaBridge(userId, `/publish ${publishPayload}`, 120_000)
        .then(async (result) => {
          if (result.ok) {
            try {
              const reply = JSON.parse(result.reply || "{}");
              await prisma.publishRecord.update({
                where: {
                  contentItemId_platform: {
                    contentItemId: contentId,
                    platform,
                  },
                },
                data: {
                  status: reply.success ? "PUBLISHED" : "FAILED",
                  platformUrl: reply.platformUrl || null,
                  publishedAt: reply.success ? new Date() : null,
                  errorMessage: reply.error || null,
                },
              });
            } catch {
              // Reply wasn't JSON, treat as plain text
              await prisma.publishRecord.update({
                where: {
                  contentItemId_platform: {
                    contentItemId: contentId,
                    platform,
                  },
                },
                data: {
                  status: "PUBLISHED",
                  publishedAt: new Date(),
                },
              });
            }
          } else {
            await prisma.publishRecord.update({
              where: {
                contentItemId_platform: {
                  contentItemId: contentId,
                  platform,
                },
              },
              data: {
                status: "FAILED",
                errorMessage: result.error || "Bridge 通信失败",
              },
            });
          }

          // Check if all records for this content are done
          const allRecords = await prisma.publishRecord.findMany({
            where: { contentItemId: contentId },
          });
          const allDone = allRecords.every(
            (r) => r.status === "PUBLISHED" || r.status === "FAILED"
          );
          if (allDone) {
            const anyPublished = allRecords.some(
              (r) => r.status === "PUBLISHED"
            );
            await prisma.contentItem.update({
              where: { id: contentId },
              data: {
                status: anyPublished ? "PUBLISHED" : "FAILED",
              },
            });
          }
        })
        .catch(async () => {
          await prisma.publishRecord
            .update({
              where: {
                contentItemId_platform: {
                  contentItemId: contentId,
                  platform,
                },
              },
              data: {
                status: "FAILED",
                errorMessage: "发布请求异常",
              },
            })
            .catch(() => {});
        });
    }

    return NextResponse.json({
      message: `正在发布到 ${platforms.length} 个平台`,
      publishRecords,
    });
  } catch (error) {
    console.error("[publish] Error:", error);
    return NextResponse.json(
      { error: "发布失败" },
      { status: 500 }
    );
  }
}
