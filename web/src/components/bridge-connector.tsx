"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    creatorDesktop?: {
      connectBridge?: (token: string) => Promise<boolean>;
      syncWorkspace?: (arrayBuffer: ArrayBuffer) => Promise<boolean>;
      startLocalOpenClaw?: () => Promise<boolean>;
      restartOpenClaw?: () => Promise<boolean>;
      runLocalSelfCheck?: () => Promise<{
        openclawPathExists?: boolean;
        workspaceWritable?: boolean;
        openclawProcessRunning?: boolean;
        openclawCrashCount?: number;
        openclawCrashLimit?: number;
      }>;
      getConfig?: () => Promise<{ useLocalOpenClaw?: boolean }>;
      getAppVersion?: () => Promise<string>;
      onOpenClawCrashLoop?: (cb: (info: { crashCount: number; message: string }) => void) => void;
      platform?: string;
    };
  }
}

const LOG_PREFIX = "[BridgeConnector]";
const MAX_RETRIES = 5;
const POLL_INTERVAL = 15_000; // Check hasBridge every 15s

/**
 * Connects the desktop app's bridge when user is logged in and useLocalOpenClaw is enabled.
 * Runs only in Electron (creatorDesktop exists).
 * Polls hasBridge and auto-reconnects if bridge drops.
 */
export function BridgeConnector() {
  const [hasBridge, setHasBridge] = useState<boolean | null>(null);
  const [desktopVersion, setDesktopVersion] = useState<string | null>(null);
  const [crashMessage, setCrashMessage] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<
    "idle" | "connecting" | "connected" | "failed" | "not_desktop"
  >("idle");

  const connectingRef = useRef(false);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const lastConnectedAtRef = useRef(0); // Timestamp of last successful connect
  const RECONNECT_COOLDOWN = 30_000; // Don't reconnect within 30s of a successful connect

  // Detect desktop environment early
  const isDesktop =
    typeof window !== "undefined" && !!window.creatorDesktop?.connectBridge;

  // ---- Core bridge connect logic with retries ----
  const attemptBridgeConnect = useCallback(async () => {
    const api = window.creatorDesktop;
    if (!api?.connectBridge || !api.getConfig) {
      console.warn(LOG_PREFIX, "Not in desktop environment, skipping bridge connect");
      setBridgeStatus("not_desktop");
      return false;
    }

    if (connectingRef.current) {
      console.log(LOG_PREFIX, "Already connecting, skipping");
      return false;
    }

    // If we connected recently, don't reconnect (desktop-side handles it)
    const sinceLastConnect = Date.now() - lastConnectedAtRef.current;
    if (sinceLastConnect < RECONNECT_COOLDOWN && lastConnectedAtRef.current > 0) {
      console.log(LOG_PREFIX, `Skipping connect: last succeeded ${Math.round(sinceLastConnect / 1000)}s ago`);
      return true; // Treat as success to stop retries
    }

    connectingRef.current = true;
    setBridgeStatus("connecting");

    try {
      // Step 1: Check config
      console.log(LOG_PREFIX, "Step 1: Getting config...");
      const config = await api.getConfig();
      if (!config?.useLocalOpenClaw) {
        console.warn(LOG_PREFIX, "useLocalOpenClaw is disabled in config");
        setBridgeStatus("idle");
        return false;
      }
      console.log(LOG_PREFIX, "Step 1 OK: useLocalOpenClaw=true");

      // Step 2: Get bridge token
      console.log(LOG_PREFIX, "Step 2: Fetching /api/bridge/token...");
      const tokenRes = await fetch("/api/bridge/token");
      if (!tokenRes.ok) {
        console.error(LOG_PREFIX, `Step 2 FAILED: token API returned ${tokenRes.status}`);
        const errText = await tokenRes.text().catch(() => "");
        console.error(LOG_PREFIX, "Token error body:", errText);
        setBridgeStatus("failed");
        return false;
      }
      const tokenData = await tokenRes.json();
      if (!tokenData?.token) {
        console.error(LOG_PREFIX, "Step 2 FAILED: token response has no token field", tokenData);
        setBridgeStatus("failed");
        return false;
      }
      console.log(LOG_PREFIX, "Step 2 OK: got bridge token (length:", tokenData.token.length, ")");

      // Step 3: Connect bridge via IPC
      console.log(LOG_PREFIX, "Step 3: Calling connectBridge IPC...");
      const ok = await api.connectBridge(tokenData.token);
      console.log(LOG_PREFIX, "Step 3 result: connectBridge returned", ok);
      if (!ok) {
        console.error(LOG_PREFIX, "Step 3 FAILED: bridge WebSocket did not connect");
        setBridgeStatus("failed");
        return false;
      }

      console.log(LOG_PREFIX, "Bridge connected successfully!");
      setBridgeStatus("connected");
      retryCountRef.current = 0;
      lastConnectedAtRef.current = Date.now();

      // Step 4: Self-check and start OpenClaw
      if (api.runLocalSelfCheck) {
        console.log(LOG_PREFIX, "Step 4: Running local self-check...");
        const check = await api.runLocalSelfCheck().catch((e) => {
          console.warn(LOG_PREFIX, "Self-check failed:", e);
          return null;
        });
        console.log(LOG_PREFIX, "Self-check result:", check);
        if (
          check &&
          check.openclawPathExists &&
          check.workspaceWritable &&
          !check.openclawProcessRunning &&
          api.startLocalOpenClaw
        ) {
          console.log(LOG_PREFIX, "OpenClaw not running, starting...");
          await api.startLocalOpenClaw();
        }
      }

      // Step 5: Sync workspace
      if (api.syncWorkspace) {
        console.log(LOG_PREFIX, "Step 5: Syncing workspace...");
        try {
          const syncRes = await fetch("/api/workspace/sync");
          if (syncRes.ok) {
            const buf = await syncRes.arrayBuffer();
            await api.syncWorkspace(buf);
            console.log(LOG_PREFIX, "Step 5 OK: workspace synced");
          } else {
            console.warn(LOG_PREFIX, "Step 5: workspace sync API returned", syncRes.status);
          }
        } catch (e) {
          console.warn(LOG_PREFIX, "Step 5: workspace sync error:", e);
        }
      }

      // Step 6: Ensure OpenClaw is started
      if (api.startLocalOpenClaw) {
        console.log(LOG_PREFIX, "Step 6: Starting local OpenClaw...");
        await api.startLocalOpenClaw().catch((e) => {
          console.warn(LOG_PREFIX, "Step 6: startLocalOpenClaw error:", e);
        });
      }

      return true;
    } catch (err) {
      console.error(LOG_PREFIX, "Bridge connect error:", err);
      setBridgeStatus("failed");
      return false;
    } finally {
      connectingRef.current = false;
    }
  }, []);

  // ---- Retry with backoff ----
  const connectWithRetry = useCallback(async () => {
    if (!mountedRef.current) return;

    const ok = await attemptBridgeConnect();
    if (ok) return;

    retryCountRef.current += 1;
    if (retryCountRef.current <= MAX_RETRIES && mountedRef.current) {
      const delay = Math.min(retryCountRef.current * 3000, 15000);
      console.log(
        LOG_PREFIX,
        `Retry ${retryCountRef.current}/${MAX_RETRIES} in ${delay / 1000}s...`
      );
      setTimeout(() => {
        if (mountedRef.current) connectWithRetry();
      }, delay);
    } else if (retryCountRef.current > MAX_RETRIES) {
      console.error(
        LOG_PREFIX,
        `Gave up after ${MAX_RETRIES} retries. Bridge will retry on next poll cycle.`
      );
    }
  }, [attemptBridgeConnect]);

  // ---- Initialize: detect desktop, version, crash listener ----
  useEffect(() => {
    mountedRef.current = true;
    const api = window.creatorDesktop;

    // Get version from main process (async IPC, most reliable in asar)
    if (api?.getAppVersion) {
      api.getAppVersion().then((v) => {
        if (v) {
          setDesktopVersion(v);
          console.log(LOG_PREFIX, "Desktop version:", v);
        }
      }).catch(() => {});
    }

    if (api?.onOpenClawCrashLoop) {
      api.onOpenClawCrashLoop((info) => {
        console.error(LOG_PREFIX, "Crash loop detected:", info);
        setCrashMessage(info.message);
      });
    }

    if (api?.connectBridge && api?.getConfig) {
      console.log(LOG_PREFIX, "Desktop environment detected, starting bridge connect...");
      connectWithRetry();
    } else {
      console.log(LOG_PREFIX, "Not in desktop environment (creatorDesktop not available)");
      setBridgeStatus("not_desktop");
    }

    return () => {
      mountedRef.current = false;
    };
  }, [connectWithRetry]);

  // ---- Poll hasBridge (status check only, no reconnect from here) ----
  useEffect(() => {
    let active = true;

    async function pollBridge() {
      try {
        const res = await fetch("/api/agent");
        const data = res.ok ? await res.json() : {};
        const connected = !!data?.hasBridge;
        if (active) setHasBridge(connected);

        // If we recently connected successfully, trust desktop-side reconnect
        const sinceLastConnect = Date.now() - lastConnectedAtRef.current;
        if (sinceLastConnect < RECONNECT_COOLDOWN) {
          if (!connected) {
            console.log(
              LOG_PREFIX,
              `hasBridge=false but within cooldown (${Math.round(sinceLastConnect / 1000)}s ago). Desktop-side will handle reconnect.`
            );
          }
          return;
        }

        // Only reconnect if bridge is genuinely down and we're not already trying
        if (
          !connected &&
          isDesktop &&
          bridgeStatus !== "connecting" &&
          !connectingRef.current &&
          active
        ) {
          console.log(LOG_PREFIX, "hasBridge=false after cooldown, attempting reconnect...");
          retryCountRef.current = 0;
          connectWithRetry();
        }
      } catch {
        if (active) setHasBridge(false);
      }
    }

    pollBridge();
    const timer = setInterval(pollBridge, POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isDesktop, bridgeStatus, connectWithRetry]);

  return (
    <>
      {/* Desktop version + bridge status indicator */}
      {(hasBridge || desktopVersion || (isDesktop && bridgeStatus === "failed")) && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1.5">
          {crashMessage && (
            <div className="rounded-lg bg-red-500/90 text-white text-xs px-3 py-1.5 shadow-lg flex items-center gap-2 max-w-xs">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="truncate">{crashMessage}</span>
            </div>
          )}
          {isDesktop && bridgeStatus === "failed" && !hasBridge && (
            <div className="rounded-lg bg-amber-500/90 text-white text-xs px-3 py-1.5 shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white" />
              Bridge 未连接（自动重试中）
            </div>
          )}
          <div
            className={`rounded-lg text-white text-xs px-3 py-1.5 shadow-lg flex items-center gap-2 ${
              hasBridge
                ? "bg-violet-500/90"
                : bridgeStatus === "connecting"
                  ? "bg-blue-400/80"
                  : "bg-gray-400/80"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                hasBridge
                  ? "bg-white animate-pulse"
                  : bridgeStatus === "connecting"
                    ? "bg-white animate-ping"
                    : "bg-gray-200"
              }`}
            />
            {hasBridge
              ? "本地模式"
              : bridgeStatus === "connecting"
                ? "正在连接..."
                : "桌面端"}
            {desktopVersion && (
              <span className="opacity-70">v{desktopVersion}</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
