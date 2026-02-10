import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getOrStartInstance } from "@/lib/openclaw";

/**
 * Agent Streaming API (Server-Sent Events)
 *
 * GET /api/agent/stream?message=... - Stream response from OpenClaw
 */

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const message = request.nextUrl.searchParams.get("message");
  if (!message) {
    return new Response("Missing message parameter", { status: 400 });
  }

  const userId = session.user.id;

  try {
    const instance = await getOrStartInstance(userId);

    // Proxy SSE from OpenClaw WebChat API
    const upstreamResponse = await fetch(
      `http://127.0.0.1:${instance.webChatPort}/api/chat/stream`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
