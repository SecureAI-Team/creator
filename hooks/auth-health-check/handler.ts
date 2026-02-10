import type { HookHandler } from "../../src/hooks/hooks.js";

/**
 * Auth Health Check Hook
 *
 * On gateway:startup, logs a reminder that auth status should be checked.
 * The actual browser-based auth checking is performed by the Agent via
 * the auth-status skill or cron-triggered isolated jobs.
 *
 * This hook serves as the bootstrapping trigger — it enqueues a system
 * event so the agent checks auth on its first heartbeat.
 */
const handler: HookHandler = async (event) => {
  if (event.type !== "gateway" || event.action !== "startup") {
    return;
  }

  console.log("[auth-health-check] Gateway started, scheduling auth check");

  event.messages.push(
    "🔐 Gateway 已启动。建议检查各平台登录状态：/auth"
  );
};

export default handler;
