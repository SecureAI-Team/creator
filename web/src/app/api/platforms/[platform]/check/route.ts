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
  // accountId can be passed as a query parameter
  const accountId = req.nextUrl.searchParams.get("accountId") || "default";

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
      where: { userId_platformKey_accountId: { userId, platformKey: platform, accountId } },
    });

    // Always try live cookie check via bridge/OpenClaw when instance is available
    if (instanceStatus.status === "running") {
      try {
        // Include accountId in command so bridge checks the right browser profile
        const statusCmd = accountId === "default"
          ? `/status ${platform}`
          : `/status ${platform} ${accountId}`;
        const reply = await sendMessage(userId, statusCmd);
        const isConnected =
          reply.toLowerCase().includes("logged in") ||
          reply.toLowerCase().includes("已登录") ||
          reply.toLowerCase().includes("connected");

        const newStatus = isConnected ? "CONNECTED" : "EXPIRED";

        // Upsert: create record if it doesn't exist, update if it does
        await prisma.platformConnection.upsert({
          where: { userId_platformKey_accountId: { userId, platformKey: platform, accountId } },
          update: { status: newStatus, lastChecked: new Date() },
          create: {
            userId,
            platformKey: platform,
            accountId,
            status: newStatus,
            lastChecked: new Date(),
          },
        });

        return NextResponse.json({
          platform,
          accountId,
          status: newStatus,
          lastChecked: new Date(),
          message: reply,
        });
      } catch {
        // OpenClaw command failed, fall through to stored status
      }
    }

    // Fall back to stored status
    return NextResponse.json({
      platform,
      accountId,
      status: connection?.status ?? "DISCONNECTED",
      lastChecked: connection?.lastChecked ?? null,
    });
  } catch (error) {
    console.error("[platforms/check] Error:", error);
    return NextResponse.json(
      { error: "Failed to check platform status" },
      { status: 500 }
    );
  }
}) as unknown as (req: Request) => Promise<Response>;
