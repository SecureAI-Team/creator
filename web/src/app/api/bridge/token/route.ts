import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SignJWT } from "jose";

/**
 * GET /api/bridge/token
 *
 * Returns a short-lived JWT for the desktop client to authenticate
 * its WebSocket connection to the bridge server.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "change-this-secret"
    );
    const token = await new SignJWT({ userId: session.user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secret);

    return NextResponse.json({ token });
  } catch (err) {
    console.error("[Bridge Token] Error:", err);
    return NextResponse.json(
      { error: "获取桥接令牌失败" },
      { status: 500 }
    );
  }
}
