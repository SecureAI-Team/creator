import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const createTopicSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/topics
 * List topics for the current user.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topics = await prisma.topic.findMany({
    where: { userId: req.auth.user.id },
    select: {
      id: true,
      name: true,
      description: true,
      tags: true,
      _count: { select: { contentItems: true } },
      createdAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ topics });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * POST /api/topics
 * Create a topic (e.g. from trend "加入选题库").
 * Body: { name, description?, tags? }
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json().catch(() => ({}));
  const parsed = createTopicSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const topic = await prisma.topic.create({
    data: {
      userId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      tags: parsed.data.tags ?? [],
    },
  });

  return NextResponse.json(topic, { status: 201 });
}) as unknown as (req: Request) => Promise<Response>;
