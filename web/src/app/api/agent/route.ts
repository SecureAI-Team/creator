import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendMessage, getInstanceStatus } from "@/lib/openclaw";

/**
 * Agent Bridge API
 *
 * POST /api/agent - Send message to user's OpenClaw instance
 * GET  /api/agent - Get user's instance status
 */

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "请提供消息内容" }, { status: 400 });
    }

    const reply = await sendMessage(session.user.id, message);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[Agent Bridge] Error:", err);
    return NextResponse.json(
      { error: "AI 助手暂时不可用，请稍后重试" },
      { status: 503 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const status = getInstanceStatus(session.user.id);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { error: "获取状态失败" },
      { status: 500 }
    );
  }
}
