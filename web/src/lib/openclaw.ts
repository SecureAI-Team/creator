import { spawn, ChildProcess } from "node:child_process";
import { initializeUserWorkspace } from "./workspace";

/**
 * OpenClaw Instance Manager
 *
 * Manages per-user OpenClaw Gateway instances:
 * - Start/stop on demand
 * - Track running instances
 * - Idle timeout auto-shutdown
 * - Port allocation
 */

interface OpenClawInstance {
  userId: string;
  process: ChildProcess | null;
  webChatPort: number;
  status: "starting" | "running" | "stopping" | "stopped";
  startedAt: Date;
  lastActivity: Date;
  workspaceDir: string;
}

// In-memory instance registry
const instances = new Map<string, OpenClawInstance>();

// WebChat port allocation (each user gets a unique port)
const WEBCHAT_PORT_BASE = 4000;

function getWebChatPort(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return WEBCHAT_PORT_BASE + (Math.abs(hash) % 1000);
}

/**
 * Get or start an OpenClaw instance for a user.
 */
export async function getOrStartInstance(
  userId: string,
  options?: { dashscopeApiKey?: string }
): Promise<OpenClawInstance> {
  const existing = instances.get(userId);
  if (existing && existing.status === "running") {
    existing.lastActivity = new Date();
    return existing;
  }

  return startInstance(userId, options);
}

/**
 * Start an OpenClaw Gateway instance for a user.
 */
export async function startInstance(
  userId: string,
  options?: { dashscopeApiKey?: string }
): Promise<OpenClawInstance> {
  const workspaceDir = initializeUserWorkspace({
    userId,
    platforms: [],
    tools: [],
    dashscopeApiKey: options?.dashscopeApiKey,
  });

  const webChatPort = getWebChatPort(userId);

  const instance: OpenClawInstance = {
    userId,
    process: null,
    webChatPort,
    status: "starting",
    startedAt: new Date(),
    lastActivity: new Date(),
    workspaceDir,
  };

  instances.set(userId, instance);

  try {
    // Start OpenClaw Gateway in the user's workspace
    const proc = spawn("openclaw", ["start", "--port", String(webChatPort)], {
      cwd: workspaceDir,
      env: {
        ...process.env,
        DASHSCOPE_API_KEY: options?.dashscopeApiKey || process.env.DASHSCOPE_API_KEY || "",
        OPENCLAW_HOME: workspaceDir,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    instance.process = proc;

    proc.on("exit", (code) => {
      console.log(`[OpenClaw] User ${userId} instance exited with code ${code}`);
      instance.status = "stopped";
      instance.process = null;
    });

    proc.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      if (output.includes("Gateway started") || output.includes("listening")) {
        instance.status = "running";
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      console.error(`[OpenClaw] User ${userId} stderr: ${data.toString()}`);
    });

    // Wait for startup (max 15 seconds)
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (instance.status === "starting") {
          instance.status = "running"; // Assume running after timeout
        }
        resolve();
      }, 15000);

      const checkInterval = setInterval(() => {
        if (instance.status === "running") {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });

    return instance;
  } catch (err) {
    instance.status = "stopped";
    throw err;
  }
}

/**
 * Stop an OpenClaw instance.
 */
export async function stopInstance(userId: string): Promise<void> {
  const instance = instances.get(userId);
  if (!instance || !instance.process) return;

  instance.status = "stopping";

  return new Promise((resolve) => {
    const proc = instance.process!;
    proc.on("exit", () => {
      instance.status = "stopped";
      instance.process = null;
      instances.delete(userId);
      resolve();
    });

    proc.kill("SIGTERM");

    // Force kill after 10 seconds
    setTimeout(() => {
      if (instance.status === "stopping") {
        proc.kill("SIGKILL");
      }
    }, 10000);
  });
}

/**
 * Send a message to a user's OpenClaw instance via WebChat API.
 */
export async function sendMessage(
  userId: string,
  message: string
): Promise<string> {
  const instance = await getOrStartInstance(userId);
  instance.lastActivity = new Date();

  // Send message via OpenClaw WebChat HTTP API
  const response = await fetch(
    `http://127.0.0.1:${instance.webChatPort}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }
  );

  if (!response.ok) {
    throw new Error(`OpenClaw API error: ${response.status}`);
  }

  const data = await response.json();
  return data.reply || data.message || "";
}

/**
 * Get instance status for a user.
 */
export function getInstanceStatus(userId: string) {
  const instance = instances.get(userId);
  if (!instance) {
    return { status: "stopped" as const, webChatPort: 0 };
  }
  return {
    status: instance.status,
    webChatPort: instance.webChatPort,
    startedAt: instance.startedAt,
    lastActivity: instance.lastActivity,
  };
}

/**
 * List all active instances.
 */
export function listInstances() {
  return Array.from(instances.entries()).map(([userId, inst]) => ({
    userId,
    status: inst.status,
    webChatPort: inst.webChatPort,
    startedAt: inst.startedAt,
    lastActivity: inst.lastActivity,
  }));
}

// ---------------------------------------------------------------------------
// Idle cleanup: shut down instances inactive for > 30 minutes
// ---------------------------------------------------------------------------

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

setInterval(() => {
  const now = Date.now();
  for (const [userId, instance] of instances) {
    if (
      instance.status === "running" &&
      now - instance.lastActivity.getTime() > IDLE_TIMEOUT_MS
    ) {
      console.log(`[OpenClaw] Idle shutdown for user ${userId}`);
      stopInstance(userId).catch(console.error);
    }
  }
}, 60 * 1000); // Check every minute
