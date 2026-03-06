import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/media
 * List media items for the current user.
 * Query params: type (IMAGE|VIDEO|AUDIO), folder, q (search filename/tags), page, pageSize
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { searchParams } = req.nextUrl;

  const type = searchParams.get("type");
  const folder = searchParams.get("folder");
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const where: Record<string, unknown> = { userId };
  if (type && ["IMAGE", "VIDEO", "AUDIO"].includes(type)) {
    where.type = type;
  }
  if (folder) where.folder = folder;
  if (q) {
    where.OR = [
      { filename: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.mediaItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.mediaItem.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * DELETE /api/media
 * Delete a media item. Body: { id: string }
 */
export const DELETE = auth(async function DELETE(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { id } = body;
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  const existing = await prisma.mediaItem.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Media item not found or access denied" },
      { status: 404 }
    );
  }

  await prisma.mediaItem.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}) as unknown as (req: Request) => Promise<Response>;
