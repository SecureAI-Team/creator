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

  // Notifications
  showNotification: ({ title, body }) =>
    ipcRenderer.invoke("show-notification", { title, body }),

  // External links
  openExternal: (url) => ipcRenderer.invoke("open-external", url),

  // Platform info
  platform: process.platform,
  version: (() => {
    try {
      return require("./package.json").version || "1.0.0";
    } catch {
      return "1.0.0";
    }
  })(),
});
