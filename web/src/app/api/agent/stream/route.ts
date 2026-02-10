import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Agent Streaming API (Server-Sent Events)
 *
 * GET /api/agent/stream?message=... - Stream response from OpenClaw
 */

const OPENCLAW_URL =
  process.env.OPENCLAW_URL || "http://openclaw:3000";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const message = request.nextUrl.searchParams.get("message");
  if (!message) {
    return new Response("Missing message parameter", { status: 400 });
  }

  try {
    // Proxy SSE from OpenClaw WebChat API
    const upstreamResponse = await fetch(
      `${OPENCLAW_URL}/api/chat/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": session.user.id,
        },
        body: JSON.stringify({ message }),
      }
    );

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return new Response("Agent unavailable", { status: 503 });
    }

    // Forward the SSE stream
    return new Response(upstreamResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response("Agent error", { status: 503 });
  }
}
