import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const createRuleSchema = z.object({
  keyword: z.string().min(1),
  reply: z.string().min(1),
  platform: z.string().optional(),
});

const updateRuleSchema = z.object({
  id: z.string(),
  keyword: z.string().min(1).optional(),
  reply: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  platform: z.string().optional(),
});

const deleteRuleSchema = z.object({
  id: z.string(),
});

/**
 * GET /api/comments/rules
 * List all auto-reply rules for the current user.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const rules = await prisma.autoReplyRule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ rules });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * POST /api/comments/rules
 * Create a new auto-reply rule.
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json();
  const parsed = createRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const rule = await prisma.autoReplyRule.create({
    data: {
      userId,
      keyword: parsed.data.keyword,
      reply: parsed.data.reply,
      platform: parsed.data.platform,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * PUT /api/comments/rules
 * Update an existing auto-reply rule.
 */
export const PUT = auth(async function PUT(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json();
  const parsed = updateRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify ownership
  const existing = await prisma.autoReplyRule.findFirst({
    where: { id: parsed.data.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const { id, ...updateData } = parsed.data;
  const updated = await prisma.autoReplyRule.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}) as unknown as (req: Request) => Promise<Response>;

/**
 * DELETE /api/comments/rules
 * Delete an auto-reply rule.
 */
export const DELETE = auth(async function DELETE(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json();
  const parsed = deleteRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = parsed.data;

  // Verify ownership
  const existing = await prisma.autoReplyRule.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  await prisma.autoReplyRule.delete({ where: { id } });

  return NextResponse.json({ success: true });
}) as unknown as (req: Request) => Promise<Response>;
