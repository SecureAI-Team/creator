import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const userId = session.user.id;

    // Update user profile
    if (body.name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: body.name },
      });
    }

    // Update preferences
    await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        timezone: body.timezone,
        notificationLevel: body.notificationLevel,
        dashscopeApiKey: body.dashscopeKey || undefined,
      },
      create: {
        userId,
        timezone: body.timezone || "Asia/Shanghai",
        notificationLevel: body.notificationLevel || "important",
        dashscopeApiKey: body.dashscopeKey || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "保存失败" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { preferences: true },
    });

    return NextResponse.json({
      name: user?.name,
      email: user?.email,
      timezone: user?.preferences?.timezone || "Asia/Shanghai",
      notificationLevel: user?.preferences?.notificationLevel || "important",
    });
  } catch {
    return NextResponse.json(
      { error: "获取设置失败" },
      { status: 500 }
    );
  }
}
