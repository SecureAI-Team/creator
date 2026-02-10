import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * WeChat account binding management.
 *
 * GET    /api/users/wechat-bind - Check if current user has a linked WeChat account
 * DELETE /api/users/wechat-bind - Unlink WeChat account
 */

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "wechat",
      },
    });

    if (account) {
      // Try to get a display name from the user profile or the account itself
      return NextResponse.json({
        bound: true,
        providerAccountId: account.providerAccountId,
      });
    }

    return NextResponse.json({ bound: false });
  } catch {
    return NextResponse.json(
      { error: "查询微信绑定状态失败" },
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

    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "wechat",
      },
    });

    if (!account) {
      return NextResponse.json({ error: "未绑定微信" }, { status: 400 });
    }

    await prisma.account.delete({
      where: {
        provider_providerAccountId: {
          provider: "wechat",
          providerAccountId: account.providerAccountId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "解绑失败" }, { status: 500 });
  }
}
