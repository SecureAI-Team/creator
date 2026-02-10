import { prisma } from "@/lib/db";
import { listInstances } from "@/lib/openclaw";
import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Health check endpoint returning system status.
 */
export async function GET() {
  const status: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = "connected";
  } catch {
    status.database = "disconnected";
    status.status = "degraded";
  }

  // OpenClaw instances summary
  try {
    const instances = listInstances();
    status.openclaw = {
      activeInstances: instances.length,
      instances: instances.map((i) => ({
        userId: i.userId.slice(0, 8) + "...",
        status: i.status,
        startedAt: i.startedAt,
      })),
    };
  } catch {
    status.openclaw = { activeInstances: 0 };
  }

  const httpStatus = status.status === "ok" ? 200 : 503;
  return NextResponse.json(status, { status: httpStatus });
}
