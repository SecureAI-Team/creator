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
    const prefs = body.preferences || body;

    // Update user profile
    if (body.name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: body.name },
      });
    }

    // Map publishMode to confirmBeforePublish
    // "manual" → true (confirm before publish), "auto" → false
    const confirmBeforePublish =
      prefs.publishMode !== undefined
        ? prefs.publishMode === "manual"
        : undefined;

    // Update preferences
    await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        timezone: prefs.timezone,
        language: prefs.language,
        notificationLevel: prefs.notificationLevel,
        ...(confirmBeforePublish !== undefined && { confirmBeforePublish }),
        dashscopeApiKey: prefs.dashscopeKey || undefined,
      },
      create: {
        userId,
        timezone: prefs.timezone || "Asia/Shanghai",
        language: prefs.language || "zh-CN",
        notificationLevel: prefs.notificationLevel || "important",
        confirmBeforePublish: confirmBeforePublish ?? true,
        dashscopeApiKey: prefs.dashscopeKey || undefined,
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
      preferences: {
        language: user?.preferences?.language || "zh-CN",
        timezone: user?.preferences?.timezone || "Asia/Shanghai",
        notificationLevel: user?.preferences?.notificationLevel || "important",
        // Map confirmBeforePublish back to publishMode for the frontend
        publishMode: user?.preferences?.confirmBeforePublish === false ? "auto" : "manual",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "获取设置失败" },
      { status: 500 }
    );
  }
}
