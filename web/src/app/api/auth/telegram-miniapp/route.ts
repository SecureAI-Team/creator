import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

/**
 * POST /api/auth/telegram-miniapp
 *
 * Validates Telegram Mini App initData and returns a session token.
 * Authentication flow:
 * 1. Receive initData from Telegram WebApp SDK
 * 2. Validate hash against bot token
 * 3. Find user by telegram binding
 * 4. Return session token
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const initData = body.initData as string;

    if (!initData) {
      return NextResponse.json(
        { error: "initData is required" },
        { status: 400 }
      );
    }

    // Parse and validate Telegram initData
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    params.delete("hash");

    if (!hash) {
      return NextResponse.json(
        { error: "Missing hash in initData" },
        { status: 400 }
      );
    }

    // Validate hash
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Telegram bot token not configured" },
        { status: 500 }
      );
    }

    // Sort params alphabetically and create data check string
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // HMAC-SHA256 verification
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(sortedParams)
      .digest("hex");

    if (calculatedHash !== hash) {
      return NextResponse.json(
        { error: "Invalid initData hash" },
        { status: 401 }
      );
    }

    // Check auth_date is not too old (5 minutes)
    const authDate = parseInt(params.get("auth_date") || "0", 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) {
      return NextResponse.json(
        { error: "initData expired" },
        { status: 401 }
      );
    }

    // Extract user info from initData
    const userParam = params.get("user");
    if (!userParam) {
      return NextResponse.json(
        { error: "No user in initData" },
        { status: 400 }
      );
    }

    const tgUser = JSON.parse(userParam);
    const telegramUserId = String(tgUser.id);

    // Find user by telegram binding
    const binding = await prisma.telegramBinding.findUnique({
      where: { telegramUserId },
      include: { user: true },
    });

    if (!binding) {
      return NextResponse.json(
        { error: "Telegram account not bound. Please bind in the web dashboard first." },
        { status: 403 }
      );
    }

    // Generate a simple session token (in production, use JWT)
    const sessionToken = crypto.randomBytes(32).toString("hex");

    // Store session (using verification token table as a simple store)
    await prisma.verificationToken.create({
      data: {
        identifier: `tg-session:${binding.userId}`,
        token: sessionToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    return NextResponse.json({
      token: sessionToken,
      userId: binding.userId,
      name: binding.user.name || tgUser.first_name || "创作者",
    });
  } catch (error) {
    console.error("[telegram-miniapp auth]", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
