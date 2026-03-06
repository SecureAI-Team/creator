import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { checkQuota, recordUsage } from "@/lib/quota";
import { NextResponse } from "next/server";
import { z } from "zod";

const createContentSchema = z.object({
  title: z.string().min(1),
  contentType: z.enum(["TEXT", "VIDEO", "AUDIO", "IMAGE"]),
  body: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
});

const updateContentSchema = createContentSchema.partial().extend({
  id: z.string(),
  status: z
    .enum(["DRAFT", "ADAPTED", "REVIEWING", "PUBLISHING", "PUBLISHED", "FAILED"])
    .optional(),
});

/**
 * GET /api/content
 * List content items for the current user.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { searchParams } = req.nextUrl;

  const status = searchParams.get("status");
  const contentType = searchParams.get("type");
  const search = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const where: Record<string, unknown> = { userId };
  if (status) where.status = status;
  if (contentType) where.contentType = contentType;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.contentItem.findMany({
      where,
      include: { publishRecords: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contentItem.count({ where }),
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
 * POST /api/content
 * Create a new content item.
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json();
  const parsed = createContentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const quota = await checkQuota(userId, "content_create");
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "今日创作次数已达上限", limit: quota.limit, used: quota.used },
      { status: 429 }
    );
  }

  const item = await prisma.contentItem.create({
    data: {
      userId,
      title: parsed.data.title,
      contentType: parsed.data.contentType,
      body: parsed.data.body,
      mediaUrl: parsed.data.mediaUrl,
      coverUrl: parsed.data.coverUrl,
      tags: parsed.data.tags || [],
      platforms: parsed.data.platforms || [],
    },
  });

  await recordUsage(userId, "content_create");
  audit({ userId, action: "content_create", target: item.id, metadata: { title: item.title } });

  return NextResponse.json(item, { status: 201 });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * PUT /api/content
 * Update an existing content item.
 */
export const PUT = auth(async function PUT(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json();
  const parsed = updateContentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify ownership
  const existing = await prisma.contentItem.findFirst({
    where: { id: parsed.data.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  const { id, ...updateData } = parsed.data;

  const updated = await prisma.contentItem.update({
    where: { id },
    data: updateData,
  });

  audit({ userId, action: "content_update", target: id });

  return NextResponse.json(updated);
}) as unknown as (req: Request) => Promise<Response>;

/**
 * DELETE /api/content
 * Delete a content item.
 */
export const DELETE = auth(async function DELETE(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.contentItem.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  await prisma.contentItem.delete({ where: { id } });

  audit({ userId, action: "content_delete", target: id, metadata: { title: existing.title } });

  return NextResponse.json({ success: true });
}) as unknown as (req: Request) => Promise<Response>;
