import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendViaBridge } from "@/lib/bridge";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/comments
 * List comments for the current user with pagination and filters.
 * Query params: platform (optional), replied ("true"/"false" optional), page, pageSize
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { searchParams } = req.nextUrl;
  const platform = searchParams.get("platform");
  const repliedParam = searchParams.get("replied");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const where: { userId: string; platform?: string; replied?: boolean } = {
    userId,
  };
  if (platform) where.platform = platform;
  if (repliedParam === "true") where.replied = true;
  if (repliedParam === "false") where.replied = false;

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { commentedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.comment.count({ where }),
  ]);

  return NextResponse.json({
    comments,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * POST /api/comments
 * Reply to a comment.
 * Body: { commentId: string, replyBody: string }
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  let body: { commentId: string; replyBody: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { commentId, replyBody } = body;
  if (!commentId || !replyBody) {
    return NextResponse.json(
      { error: "commentId and replyBody are required" },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  if (comment.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: {
      replied: true,
      replyBody,
      repliedAt: new Date(),
    },
  });

  audit({ userId, action: "comment_reply", target: commentId, metadata: { platform: comment.platform } });

  const message = `/comments reply ${JSON.stringify({
    platform: comment.platform,
    externalId: comment.externalId,
    replyBody,
  })}`;
  sendViaBridge(userId, message, 60_000).catch(() => {});

  return NextResponse.json(updated);
}) as unknown as (req: Request) => Promise<Response>;

/**
 * DELETE /api/comments
 * Delete a comment.
 * Body: { commentId: string }
 */
export const DELETE = auth(async function DELETE(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  let body: { commentId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { commentId } = body;
  if (!commentId) {
    return NextResponse.json(
      { error: "commentId is required" },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  if (comment.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  return NextResponse.json({ success: true });
}) as unknown as (req: Request) => Promise<Response>;
