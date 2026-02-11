import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/vnc-password
 * Returns the VNC connection password for the current user.
 * Only available to authenticated users (needed for noVNC login).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const password = process.env.VNC_PASSWORD || "creator123";
  return NextResponse.json({ password });
}
