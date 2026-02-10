import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendMessage } from "@/lib/openclaw";

/**
 * Platform Login API
 *
 * POST /api/platforms/login - Trigger browser login for a platform
 */

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { platform } = await request.json();
    if (!platform) {
      return NextResponse.json({ error: "请指定平台" }, { status: 400 });
    }

    // Send login command to user's OpenClaw instance
    const reply = await sendMessage(
      session.user.id,
      `/login ${platform}`
    );

    return NextResponse.json({ reply, message: "请在 VNC 窗口中完成登录" });
  } catch {
    return NextResponse.json(
      { error: "启动登录失败" },
      { status: 500 }
    );
  }
}
