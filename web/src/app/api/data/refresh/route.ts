import { auth } from "@/lib/auth";
import { sendMessage } from "@/lib/openclaw";
import { NextResponse } from "next/server";

/**
 * POST /api/data/refresh
 * Trigger an OpenClaw data pull from platforms to refresh metrics.
 * Query params: ?platform=bilibili (optional, refreshes all if omitted)
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json().catch(() => ({}));
  const platform = (body as Record<string, string>).platform;

  try {
    const command = platform
      ? `/data refresh ${platform}`
      : `/data refresh all`;

    const reply = await sendMessage(userId, command);

    return NextResponse.json({
      success: true,
      message: reply,
    });
  } catch (error) {
    console.error("[data/refresh] Error:", error);
    return NextResponse.json(
      { error: "Failed to trigger data refresh" },
      { status: 500 }
    );
  }
}) as unknown as (req: Request) => Promise<Response>;
