import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/tasks
 * List task executions for the current user.
 * Params: ?status=running&taskType=publish&page=1&pageSize=20
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const taskType = searchParams.get("taskType");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "20", 10));

  const where: Record<string, unknown> = { userId };
  if (status) where.status = status;
  if (taskType) where.taskType = taskType;

  const [tasks, total] = await Promise.all([
    prisma.taskExecution.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.taskExecution.count({ where }),
  ]);

  // Summary stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStats = await prisma.taskExecution.groupBy({
    by: ["status"],
    where: { userId, createdAt: { gte: today } },
    _count: true,
  });

  const stats: Record<string, number> = {};
  for (const s of todayStats) {
    stats[s.status] = s._count;
  }

  return NextResponse.json({
    tasks,
    total,
    page,
    pageSize,
    todayStats: stats,
  });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * POST /api/tasks
 * Create a task execution record (usually called internally when kicking off work).
 * Body: { taskType, platform?, input? }
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json().catch(() => ({}));
  const { taskType, platform, input } = body as {
    taskType?: string;
    platform?: string;
    input?: Record<string, unknown>;
  };

  if (!taskType) {
    return NextResponse.json({ error: "taskType is required" }, { status: 400 });
  }

  const task = await prisma.taskExecution.create({
    data: {
      userId,
      taskType,
      platform: platform || null,
      input: input || undefined,
      status: "pending",
    },
  });

  return NextResponse.json({ task });
}) as unknown as (req: Request) => Promise<Response>;
