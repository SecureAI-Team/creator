/**
 * Bridge client - used by Next.js to route agent requests to local OpenClaw
 * when a desktop client has an active WebSocket connection.
 *
 * The actual bridge connections live in the bridge-server process.
 * This module provides the HTTP client to call the bridge server's internal API.
 */

const BRIDGE_INTERNAL_URL =
  process.env.BRIDGE_INTERNAL_URL || "http://127.0.0.1:3002";

export interface BridgeSendResult {
  ok: boolean;
  reply?: string;
  error?: string;
}

/**
 * Try to send a message via the user's local bridge (desktop client).
 * Returns { ok: true, reply } if successful, { ok: false } if no bridge or error.
 */
export async function sendViaBridge(
  userId: string,
  message: string,
  timeoutMs = 60_000
): Promise<BridgeSendResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${BRIDGE_INTERNAL_URL}/internal/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 404) {
      return { ok: false, error: "no_bridge" };
    }
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: err || `HTTP ${res.status}` };
    }

    const data = (await res.json()) as { reply?: string };
    return { ok: true, reply: data.reply || "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * Check if the user has an active bridge connection.
 */
export async function hasBridge(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_INTERNAL_URL}/internal/status?userId=${encodeURIComponent(userId)}`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { connected?: boolean };
    return !!data.connected;
  } catch {
    return false;
  }
}
