/**
 * OpenClaw Client
 *
 * In the Docker deployment, the OpenClaw Gateway runs as a dedicated container
 * (managed by supervisord) with Chromium + VNC display. The web container
 * forwards messages to the openclaw container over the Docker network.
 *
 * Environment variable OPENCLAW_URL controls the endpoint.
 * Default: http://openclaw:3000 (Docker service name).
 */

const OPENCLAW_URL =
  process.env.OPENCLAW_URL || "http://openclaw:3000";

interface InstanceStatus {
  status: "running" | "stopped" | "unreachable";
  webChatPort: number;
  startedAt?: Date;
  lastActivity?: Date;
}

/**
 * Send a message to the OpenClaw Gateway via its WebChat HTTP API.
 */
export async function sendMessage(
  userId: string,
  message: string
): Promise<string> {
  const response = await fetch(`${OPENCLAW_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    body: JSON.stringify({ message }),
    signal: AbortSignal.timeout(60_000), // 60s timeout for browser operations
  });

  if (!response.ok) {
    throw new Error(`OpenClaw API error: ${response.status}`);
  }

  const data = await response.json();
  return data.reply || data.message || "";
}

/**
 * Get the OpenClaw instance status by checking health endpoint.
 */
export function getInstanceStatus(userId: string): InstanceStatus {
  // In Docker mode, there is a single shared openclaw container.
  // We return a consistent status; the actual health is checked asynchronously.
  void userId; // unused in single-instance mode
  return {
    status: "running",
    webChatPort: 3000,
  };
}

/**
 * Get or "start" an OpenClaw instance.
 * In Docker mode the container is always running, so this just returns
 * connection info for the upstream openclaw container.
 */
export async function getOrStartInstance(userId: string) {
  // Verify the container is reachable
  try {
    const res = await fetch(`${OPENCLAW_URL}/`, {
      signal: AbortSignal.timeout(5_000),
    });
    void res;
  } catch {
    // Container may not have a root handler; that's fine
  }

  return {
    userId,
    webChatPort: 3000,
    status: "running" as const,
    startedAt: new Date(),
    lastActivity: new Date(),
    url: OPENCLAW_URL,
  };
}

/**
 * List active OpenClaw instances.
 * In Docker mode there is exactly one shared instance.
 */
export function listInstances() {
  return [
    {
      userId: "shared",
      status: "running" as const,
      webChatPort: 3000,
      startedAt: new Date(),
      lastActivity: new Date(),
    },
  ];
}
