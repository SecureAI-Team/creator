import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMessage, getInstanceStatus } from "@/lib/openclaw";
import { NextResponse } from "next/server";

/**
 * GET /api/platforms/[platform]/check
 * Check the login/connection status of a platform for the current user.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const platform = req.nextUrl.pathname.split("/").at(-2) ?? "";

  if (!platform) {
    return NextResponse.json(
      { error: "Platform parameter required" },
      { status: 400 }
    );
  }

  try {
    // Check if OpenClaw instance is running
    const instanceStatus = getInstanceStatus(userId);

    // Get stored platform connection from DB
    const connection = await prisma.platformConnection.findUnique({
      where: { userId_platformKey: { userId, platformKey: platform } },
    });

    if (!connection) {
      return NextResponse.json({
        platform,
        status: "DISCONNECTED",
        lastChecked: null,
      });
    }

    // If instance is running, ask it to check the platform status
    if (instanceStatus.status === "running") {
      try {
        const reply = await sendMessage(userId, `/status ${platform}`);
        const isConnected =
          reply.toLowerCase().includes("logged in") ||
          reply.toLowerCase().includes("已登录") ||
          reply.toLowerCase().includes("connected");

        const newStatus = isConnected ? "CONNECTED" : "EXPIRED";

        await prisma.platformConnection.update({
          where: { id: connection.id },
          data: { status: newStatus, lastChecked: new Date() },
        });

        return NextResponse.json({
          platform,
          status: newStatus,
          lastChecked: new Date(),
          message: reply,
        });
      } catch {
        // OpenClaw command failed, return stored status
      }
    }

    return NextResponse.json({
      platform,
      status: connection.status,
      lastChecked: connection.lastChecked,
    });
  } catch (error) {
    console.error("[platforms/check] Error:", error);
    return NextResponse.json(
      { error: "Failed to check platform status" },
      { status: 500 }
    );
  }
}) as unknown as (req: Request) => Promise<Response>;
