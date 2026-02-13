import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * POST /api/platforms/[platform]/confirm
 * User manually confirms they have completed login in their local browser.
 * This marks the platform as CONNECTED in the database.
 */
export const POST = auth(async function POST(req) {
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
    // Upsert the platform connection as CONNECTED
    await prisma.platformConnection.upsert({
      where: { userId_platformKey: { userId, platformKey: platform } },
      update: {
        status: "CONNECTED",
        lastChecked: new Date(),
      },
      create: {
        userId,
        platformKey: platform,
        status: "CONNECTED",
        lastChecked: new Date(),
      },
    });

    return NextResponse.json({
      platform,
      status: "CONNECTED",
      lastChecked: new Date(),
      message: "登录状态已确认",
    });
  } catch (error) {
    console.error("[platforms/confirm] Error:", error);
    return NextResponse.json(
      { error: "Failed to confirm platform status" },
      { status: 500 }
    );
  }
}) as unknown as (req: Request) => Promise<Response>;
