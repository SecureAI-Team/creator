import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "node:crypto";

/**
 * Generate a Telegram bind code for the current user.
 *
 * POST /api/users/telegram-bind - Generate new bind code
 * DELETE /api/users/telegram-bind - Unbind Telegram
 */

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if already bound
    const existing = await prisma.telegramBinding.findUnique({
      where: { userId },
    });

    if (existing && existing.telegramUserId) {
      return NextResponse.json({
        bound: true,
        telegramUsername: existing.telegramUsername,
      });
    }

    // Generate bind code (6-char alphanumeric)
    const bindCode = randomBytes(3).toString("hex").toUpperCase();
    const bindCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.telegramBinding.upsert({
      where: { userId },
      update: {
        bindCode,
        bindCodeExpiry,
      },
      create: {
        userId,
        telegramUserId: "", // Placeholder until bound
        bindCode,
        bindCodeExpiry,
      },
    });

    return NextResponse.json({
      bindCode,
      expiresIn: 600, // seconds
      instruction: `请在 Telegram Bot 中发送: /bind ${bindCode}`,
    });
  } catch {
    return NextResponse.json(
      { error: "生成绑定码失败" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    await prisma.telegramBinding.delete({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "解绑失败" },
      { status: 500 }
    );
  }
}
