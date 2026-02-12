import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendMessageServerOnly } from "@/lib/openclaw";
import { hasBridge, sendViaBridgeAck } from "@/lib/bridge";
import { ensureUserWorkspaceExists } from "@/lib/workspace";

const LOGIN_DEDUPE_WINDOW_MS = 20_000;
const loginInFlight = new Map<string, number>();

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

    const { platform, forceVnc } = await request.json();
    if (!platform) {
      return NextResponse.json({ error: "请指定平台" }, { status: 400 });
    }

    // Ensure user workspace exists before login (so OpenClaw/VNC has workspace)
    ensureUserWorkspaceExists(session.user.id);

    const command = `/login ${platform}`;
    const dedupeKey = `${session.user.id}:${platform}`;
    const now = Date.now();
    const lastAt = loginInFlight.get(dedupeKey) || 0;
    if (now - lastAt < LOGIN_DEDUPE_WINDOW_MS) {
      return NextResponse.json({
        mode: "local",
        fallbackToVnc: false,
        deduped: true,
        message: "该平台登录流程正在进行中，请先完成当前登录",
      });
    }
    loginInFlight.set(dedupeKey, now);
    const useLocal = !forceVnc && await hasBridge(session.user.id);

    if (useLocal) {
      // Local-first: require quick ACK from desktop bridge.
      // If no ACK, fallback to server OpenClaw (VNC path) automatically.
      const ack = await sendViaBridgeAck(session.user.id, command, 3_000);
      if (ack.ok) {
        return NextResponse.json({
          mode: "local",
          fallbackToVnc: false,
          stage: ack.stage || "received",
          message: "本地客户端已接收登录指令，请在本地弹出的浏览器中完成登录",
        });
      }
    }

    // Fallback path: trigger server-side OpenClaw for VNC login.
    const reply = await sendMessageServerOnly(session.user.id, command);
    return NextResponse.json({
      mode: "vnc",
      fallbackToVnc: true,
      reply,
      message: "本地执行未确认，已自动切换到 VNC 备用方案",
    });
  } catch {
    return NextResponse.json(
      { error: "启动登录失败" },
      { status: 500 }
    );
  } finally {
    // Release dedupe lock after short window; user can retry if needed.
    setTimeout(() => {
      // keep small memory usage and avoid unbounded map growth
      for (const [k, ts] of loginInFlight.entries()) {
        if (Date.now() - ts > LOGIN_DEDUPE_WINDOW_MS) {
          loginInFlight.delete(k);
        }
      }
    }, LOGIN_DEDUPE_WINDOW_MS + 500);
  }
}
