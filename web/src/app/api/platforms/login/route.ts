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
 *
 * Never returns 500 for login. If all automation paths fail,
 * falls back to VNC so the user can login manually.
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
    try {
      ensureUserWorkspaceExists(session.user.id);
    } catch (e) {
      console.warn("[Login] ensureUserWorkspaceExists error:", e);
    }

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

    // ---- Step 1: Try local bridge (desktop client) ----
    const useLocal = !forceVnc && await hasBridge(session.user.id);
    if (useLocal) {
      try {
        const ack = await sendViaBridgeAck(session.user.id, command, 3_000);
        if (ack.ok) {
          return NextResponse.json({
            mode: "local",
            fallbackToVnc: false,
            stage: ack.stage || "received",
            message: "本地客户端已接收登录指令，请在本地弹出的浏览器中完成登录",
          });
        }
        console.warn("[Login] Bridge ACK failed:", ack.error);
      } catch (e) {
        console.warn("[Login] Bridge ACK exception:", e);
      }
    }

    // ---- Step 2: Fallback to server-side OpenClaw (VNC) ----
    try {
      const reply = await sendMessageServerOnly(session.user.id, command);
      return NextResponse.json({
        mode: "vnc",
        fallbackToVnc: true,
        reply,
        message: "本地执行未确认，已自动切换到 VNC 备用方案",
      });
    } catch (e) {
      console.warn("[Login] Server OpenClaw also failed:", e);
    }

    // ---- Step 3: Both failed — still return VNC fallback (user can login manually) ----
    return NextResponse.json({
      mode: "vnc",
      fallbackToVnc: true,
      reply: "",
      message: "自动登录暂不可用，请在 VNC 窗口中手动登录",
    });
  } catch (err) {
    console.error("[Login] Unexpected error:", err);
    // Even on unexpected error, return VNC fallback instead of 500
    return NextResponse.json({
      mode: "vnc",
      fallbackToVnc: true,
      reply: "",
      message: "登录服务异常，请在 VNC 窗口中手动登录",
    });
  } finally {
    setTimeout(() => {
      for (const [k, ts] of loginInFlight.entries()) {
        if (Date.now() - ts > LOGIN_DEDUPE_WINDOW_MS) {
          loginInFlight.delete(k);
        }
      }
    }, LOGIN_DEDUPE_WINDOW_MS + 500);
  }
}
