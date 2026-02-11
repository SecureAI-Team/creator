"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    creatorDesktop?: {
      connectBridge?: (token: string) => Promise<boolean>;
      syncWorkspace?: (arrayBuffer: ArrayBuffer) => Promise<boolean>;
      startLocalOpenClaw?: () => Promise<boolean>;
      getConfig?: () => Promise<{ useLocalOpenClaw?: boolean }>;
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

  return hasBridge ? (
    <div className="fixed bottom-4 right-4 z-40 rounded-lg bg-violet-500/90 text-white text-xs px-3 py-1.5 shadow-lg flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      本地模式
    </div>
  ) : null;
}
