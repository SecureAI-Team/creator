// =============================================================================
// Preload script: expose safe IPC to renderer
// =============================================================================

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("creatorDesktop", {
  // Server setup
  saveServerUrl: (url) => ipcRenderer.invoke("save-server-url", url),

  // Config
  getConfig: () => ipcRenderer.invoke("get-config"),
  updateSettings: (settings) => ipcRenderer.invoke("update-settings", settings),

  // Local OpenClaw bridge (connect with token from /api/bridge/token)
  connectBridge: (token) => ipcRenderer.invoke("connect-bridge", token),

  // Sync workspace from server (pass ArrayBuffer from fetch)
  syncWorkspace: (arrayBuffer) => ipcRenderer.invoke("sync-workspace", arrayBuffer),

  // Start local OpenClaw
  startLocalOpenClaw: () => ipcRenderer.invoke("start-local-openclaw"),
  getLocalRuntimeStatus: () => ipcRenderer.invoke("get-local-runtime-status"),
  runLocalSelfCheck: () => ipcRenderer.invoke("run-local-self-check"),
  restartOpenClaw: () => ipcRenderer.invoke("restart-openclaw"),
  onOpenClawCrashLoop: (cb) => ipcRenderer.on("openclaw-crash-loop", (_e, info) => cb(info)),

  // Logs
  getLogs: (count) => ipcRenderer.invoke("get-logs", count),
  getLogFilePath: () => ipcRenderer.invoke("get-log-file-path"),
  openLogFolder: () => ipcRenderer.invoke("open-log-folder"),

  // Auto-update
  checkForUpdate: () => ipcRenderer.invoke("check-for-update"),
  onUpdateAvailable: (cb) => ipcRenderer.on("update-available", (_e, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on("update-downloaded", (_e, info) => cb(info)),

  // Notifications
  showNotification: ({ title, body }) =>
    ipcRenderer.invoke("show-notification", { title, body }),

  // External links
  openExternal: (url) => ipcRenderer.invoke("open-external", url),

  // Platform info
  platform: process.platform,
  version: (() => {
    try {
      return require(require("path").join(__dirname, "package.json")).version || "unknown";
    } catch {
      return "unknown";
    }
  })(),
});
