"use client";

import { useEffect, useRef, useState } from "react";

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
      onOpenClawCrashLoop?: (cb: (info: { crashCount: number; message: string }) => void) => void;
      version?: string;
      platform?: string;
    };
  }
}

/**
 * Connects the desktop app's bridge when user is logged in and useLocalOpenClaw is enabled.
 * Runs only in Electron (creatorDesktop exists).
 * Also fetches hasBridge for PWA/extension to show local mode indicator.
 */
export function BridgeConnector() {
  const didConnect = useRef(false);
  const [hasBridge, setHasBridge] = useState<boolean | null>(null);
  const [desktopVersion, setDesktopVersion] = useState<string | null>(null);
  const [crashMessage, setCrashMessage] = useState<string | null>(null);

  // Expose hasBridge globally for layout/sidebar (PWA/extension can show "本地模式" indicator)
  useEffect(() => {
    const timer = setInterval(() => {
      fetch("/api/agent")
        .then((r) => (r.ok ? r.json() : {}))
        .then((d: { hasBridge?: boolean }) => setHasBridge(!!d?.hasBridge))
        .catch(() => setHasBridge(false));
    }, 30_000);
    fetch("/api/agent")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { hasBridge?: boolean }) => setHasBridge(!!d?.hasBridge))
      .catch(() => setHasBridge(false));
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const api = typeof window !== "undefined" ? window.creatorDesktop : undefined;
    if (!api?.connectBridge || !api.getConfig) return;

    // Capture desktop client version
    if (api.version) setDesktopVersion(api.version);

    // Listen for crash loop notifications
    if (api.onOpenClawCrashLoop) {
      api.onOpenClawCrashLoop((info) => {
        setCrashMessage(info.message);
      });
    }

    let mounted = true;

    async function run() {
      try {
        const config = await api!.getConfig!();
        if (!config?.useLocalOpenClaw) return;

        const tokenRes = await fetch("/api/bridge/token");
        if (!tokenRes.ok || !mounted) return;

        const { token } = await tokenRes.json();
        if (!token || !mounted) return;

        const ok = await api!.connectBridge!(token);
        if (!ok || !mounted) return;

        didConnect.current = true;

        // Startup self-check: verify local runtime readiness and attempt recovery.
        if (api!.runLocalSelfCheck) {
          const check = await api!.runLocalSelfCheck!().catch(() => null);
          if (check && check.openclawPathExists && check.workspaceWritable && !check.openclawProcessRunning && api!.startLocalOpenClaw) {
            await api!.startLocalOpenClaw!();
          }
        }

        // Sync workspace and start OpenClaw when bridge is connected
        if (api!.syncWorkspace) {
          const syncRes = await fetch("/api/workspace/sync");
          if (syncRes.ok) {
            const buf = await syncRes.arrayBuffer();
            await api!.syncWorkspace!(buf);
          }
        }
        if (api!.startLocalOpenClaw) {
          await api!.startLocalOpenClaw!();
        }
      } catch {
        // Ignore (e.g. network, not in desktop)
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      {/* Desktop version + bridge status indicator */}
      {(hasBridge || desktopVersion) && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1.5">
          {crashMessage && (
            <div className="rounded-lg bg-red-500/90 text-white text-xs px-3 py-1.5 shadow-lg flex items-center gap-2 max-w-xs">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="truncate">{crashMessage}</span>
            </div>
          )}
          <div
            className={`rounded-lg text-white text-xs px-3 py-1.5 shadow-lg flex items-center gap-2 ${
              hasBridge ? "bg-violet-500/90" : "bg-gray-400/80"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                hasBridge ? "bg-white animate-pulse" : "bg-gray-200"
              }`}
            />
            {hasBridge ? "本地模式" : "桌面端"}
            {desktopVersion && (
              <span className="opacity-70">v{desktopVersion}</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
