import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const cronSchema = z.object({
  name: z.string().min(1),
  schedule: z.string().min(1),
  message: z.string().min(1),
  enabled: z.boolean().optional(),
});

const updateCronSchema = cronSchema.partial().extend({
  id: z.string(),
});

/**
 * GET /api/cron
 * List user's cron jobs.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const jobs = await prisma.userCronJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ jobs });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * POST /api/cron
 * Create a new cron job.
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json();
  const parsed = cronSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const job = await prisma.userCronJob.create({
    data: {
      userId,
      name: parsed.data.name,
      schedule: parsed.data.schedule,
      message: parsed.data.message,
      enabled: parsed.data.enabled ?? true,
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * PUT /api/cron
 * Update a cron job.
 */
export const PUT = auth(async function PUT(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json();
  const parsed = updateCronSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify ownership
  const existing = await prisma.userCronJob.findFirst({
    where: { id: parsed.data.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const { id, ...updateData } = parsed.data;
  const updated = await prisma.userCronJob.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ job: updated });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * DELETE /api/cron
 * Delete a cron job. Pass { id } in body.
 */
export const DELETE = auth(async function DELETE(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json();
  const { id } = body as { id: string };

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.userCronJob.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await prisma.userCronJob.delete({ where: { id } });

  return NextResponse.json({ success: true });
}) as unknown as (req: Request) => Promise<Response>;
