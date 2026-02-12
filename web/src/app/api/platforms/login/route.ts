import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendMessage } from "@/lib/openclaw";
import { hasBridge } from "@/lib/bridge";
import { ensureUserWorkspaceExists } from "@/lib/workspace";

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

    // Ensure user workspace exists before login (so OpenClaw/VNC has workspace)
    ensureUserWorkspaceExists(session.user.id);

    // Send login command to user's OpenClaw instance (local bridge or server)
    const reply = await sendMessage(
      session.user.id,
      `/login ${platform}`
    );

    const useLocal = await hasBridge(session.user.id);
    const message = useLocal
      ? "请在本地浏览器窗口中完成登录"
      : "请在 VNC 窗口中完成登录";

    return NextResponse.json({ reply, message });
  } catch {
    return NextResponse.json(
      { error: "启动登录失败" },
      { status: 500 }
    );
  }
}
