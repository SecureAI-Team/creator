import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendMessage, getInstanceStatus } from "@/lib/openclaw";
import { hasBridge } from "@/lib/bridge";

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

    const body = await request.json().catch(() => ({}));
    const message = body.message;
    const topicId = typeof body.topicId === "string" && body.topicId ? body.topicId : undefined;
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "请提供消息内容" }, { status: 400 });
    }

    // When user came from "从该选题创作", inject topicId so the agent/tools can associate new content with this topic
    const messageToSend = topicId
      ? `${message}\n\n（系统上下文：当前选题ID=${topicId}，若创建内容请关联此选题）`
      : message;

    const reply = await sendMessage(session.user.id, messageToSend);

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
    const useLocal = await hasBridge(session.user.id);
    return NextResponse.json({ ...status, hasBridge: useLocal });
  } catch {
    return NextResponse.json(
      { error: "获取状态失败" },
      { status: 500 }
    );
  }
}
