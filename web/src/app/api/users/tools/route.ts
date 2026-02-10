import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * GET /api/users/tools
 * Get all tool configurations for the current user.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tools = await prisma.toolConfig.findMany({
    where: { userId: req.auth.user.id },
    orderBy: { toolKey: "asc" },
  });

  return NextResponse.json({ tools });
}) as unknown as (req: Request) => Promise<Response>;

const updateToolSchema = z.object({
  toolKey: z.string(),
  enabled: z.boolean().optional(),
  isDefaultFor: z.string().nullable().optional(),
});

/**
 * PUT /api/users/tools
 * Update a tool configuration (enable/disable, set as default).
 */
export const PUT = auth(async function PUT(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json();
  const parsed = updateToolSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const tool = await prisma.toolConfig.upsert({
    where: {
      userId_toolKey: { userId, toolKey: parsed.data.toolKey },
    },
    update: {
      ...(parsed.data.enabled !== undefined && { enabled: parsed.data.enabled }),
      ...(parsed.data.isDefaultFor !== undefined && {
        isDefaultFor: parsed.data.isDefaultFor,
      }),
    },
    create: {
      userId,
      toolKey: parsed.data.toolKey,
      enabled: parsed.data.enabled ?? false,
      isDefaultFor: parsed.data.isDefaultFor ?? null,
    },
  });

  return NextResponse.json(tool);
}) as unknown as (req: Request) => Promise<Response>;
