// =============================================================================
// 自媒体创作助手 - Electron Main Process
// Lightweight shell that loads the SaaS web dashboard with native features
// =============================================================================

const { app, BrowserWindow, shell, ipcMain, Notification, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");
const Store = require("electron-store");
const { createTray } = require("./tray");
const { createBridge } = require("./bridge");
const extract = require("extract-zip");

const store = new Store({
  defaults: {
    serverUrl: "",
    useLocalOpenClaw: true,
    windowBounds: { width: 1280, height: 800 },
    minimizeToTray: true,
  },
});

let mainWindow = null;
let tray = null;
let bridgeInstance = null;
let openclawProcess = null;
let openclawRestartTimer = null;
let localOpenClawPort = 3000;
let keepLocalOpenClawAlive = false;
let openclawStartedAt = 0;
let openclawCrashCount = 0;

const TASK_STATE_KEY = "localTaskState";
const DEFAULT_TASK_STATE = {
  updatedAt: 0,
  lastSuccessAt: 0,
  byRequestId: {},
};

function createWindow() {
  const { width, height, x, y } = store.get("windowBounds");

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: 800,
    minHeight: 600,
    title: "创作助手",
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false,
  });

  // Save window position on move/resize
  mainWindow.on("resize", saveWindowBounds);
  mainWindow.on("move", saveWindowBounds);

  // Show when ready to prevent flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Handle close: minimize to tray instead of quitting
  mainWindow.on("close", (event) => {
    if (store.get("minimizeToTray") && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Load the server URL or setup page
  loadApp();
}

function loadApp() {
  const serverUrl = store.get("serverUrl");
  if (serverUrl) {
    // Load /overview so user lands on dashboard (redirects to /login if not authenticated)
    const target = serverUrl.replace(/\/+$/, "") + "/overview";
    mainWindow.loadURL(target).catch(() => {
      // Fallback to root if /overview fails
      mainWindow.loadURL(serverUrl).catch(() => {
        mainWindow.loadFile(path.join(__dirname, "setup.html"));
      });
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, "setup.html"));
  }
}

function saveWindowBounds() {
  if (mainWindow) {
    store.set("windowBounds", mainWindow.getBounds());
  }
}

function getWorkspaceDir() {
  const workspaceDir = path.join(app.getPath("userData"), "workspace");
  fs.mkdirSync(workspaceDir, { recursive: true });
  return workspaceDir;
}

function getOpenClawPath() {
  try {
    const pkgPath = require.resolve("openclaw/package.json");
    return path.join(path.dirname(pkgPath), "openclaw.mjs");
  } catch {
    return path.join(__dirname, "node_modules", "openclaw", "openclaw.mjs");
  }
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function pickOpenClawPort(start = 3000, end = 3010) {
  for (let p = start; p <= end; p++) {
    if (await isPortAvailable(p)) return p;
  }
  return start;
}

async function probeOpenClawApi(port, timeoutMs = 1500) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "/help" }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function persistTaskEvent(evt) {
  const state = store.get(TASK_STATE_KEY, DEFAULT_TASK_STATE);
  const byRequestId = state.byRequestId || {};
  const requestId = evt.requestId || `evt-${Date.now()}`;
  const prev = byRequestId[requestId] || {};
  const next = {
    ...prev,
    requestId,
    message: evt.message || prev.message || "",
    updatedAt: evt.ts || Date.now(),
    stage: evt.stage || prev.stage || null,
    ok: typeof evt.ok === "boolean" ? evt.ok : prev.ok,
    error: evt.error || prev.error || null,
  };
  byRequestId[requestId] = next;

  // Keep state bounded
  const ids = Object.keys(byRequestId);
  if (ids.length > 200) {
    ids
      .sort((a, b) => (byRequestId[a].updatedAt || 0) - (byRequestId[b].updatedAt || 0))
      .slice(0, ids.length - 200)
      .forEach((id) => delete byRequestId[id]);
  }

  store.set(TASK_STATE_KEY, {
    updatedAt: Date.now(),
    lastSuccessAt: evt.ok ? Date.now() : state.lastSuccessAt || 0,
    byRequestId,
  });
}

async function runLocalSelfCheck() {
  const workspaceDir = getWorkspaceDir();
  const openclawPath = getOpenClawPath();
  const writeProbe = path.join(workspaceDir, ".write-probe");
  let workspaceWritable = false;
  try {
    fs.writeFileSync(writeProbe, String(Date.now()), "utf-8");
    fs.unlinkSync(writeProbe);
    workspaceWritable = true;
  } catch {
    workspaceWritable = false;
  }

  const openclawPortFree = await isPortAvailable(localOpenClawPort);
  const openclawHealthy = await probeOpenClawApi(localOpenClawPort, 1200);

  return {
    checkedAt: Date.now(),
    bridgeConnected: !!(bridgeInstance && bridgeInstance.isConnected && bridgeInstance.isConnected()),
    openclawProcessRunning: !!(openclawProcess && !openclawProcess.killed),
    openclawHealthy,
    openclawPort: localOpenClawPort,
    openclawPortFree,
    workspaceDir,
    workspaceWritable,
    openclawPathExists: fs.existsSync(openclawPath),
    embeddedRuntime: process.execPath,
  };
}

function scheduleOpenClawRestart(delayMs = 2000) {
  if (!keepLocalOpenClawAlive) return;
  if (openclawRestartTimer) clearTimeout(openclawRestartTimer);
  openclawRestartTimer = setTimeout(() => {
    openclawRestartTimer = null;
    startLocalOpenClawInternal().catch((err) => {
      console.error("[OpenClaw] auto-restart failed:", err?.message || err);
      scheduleOpenClawRestart(5000);
    });
  }, delayMs);
}

function resetBrowserProfiles() {
  const workspaceDir = getWorkspaceDir();
  const profilesDir = path.join(workspaceDir, "browser-profiles");
  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
    return;
  }
  const backupDir = path.join(workspaceDir, `browser-profiles.broken.${Date.now()}`);
  try {
    fs.renameSync(profilesDir, backupDir);
  } catch {
    // If rename fails, keep going and try creating fresh directory
  }
  fs.mkdirSync(profilesDir, { recursive: true });
}

async function startLocalOpenClawInternal() {
  if (openclawProcess) return true;

  const workspaceDir = getWorkspaceDir();
  const openclawPath = getOpenClawPath();
  if (!fs.existsSync(openclawPath)) return false;

  localOpenClawPort = await pickOpenClawPort(3000, 3010);
  const runtimeCmd = process.execPath;

  try {
    openclawProcess = spawn(runtimeCmd, [openclawPath, "start", "--port", String(localOpenClawPort)], {
      cwd: workspaceDir,
      env: {
        ...process.env,
        OPENCLAW_HOME: workspaceDir,
        ELECTRON_RUN_AS_NODE: "1",
      },
      stdio: "inherit",
    });
    openclawStartedAt = Date.now();
  } catch (err) {
    console.error("[OpenClaw] spawn failed:", err.message);
    openclawProcess = null;
    return false;
  }

  openclawProcess.on("error", (err) => {
    console.error("[OpenClaw] process error:", err.message);
    openclawProcess = null;
    scheduleOpenClawRestart(3000);
  });
  openclawProcess.on("exit", () => {
    const uptimeMs = Date.now() - openclawStartedAt;
    if (uptimeMs < 10_000) {
      openclawCrashCount += 1;
    } else {
      openclawCrashCount = 0;
    }
    if (openclawCrashCount >= 2) {
      // Profile corruption can cause repeated early crashes; switch to a clean profile dir.
      resetBrowserProfiles();
      openclawCrashCount = 0;
    }
    openclawProcess = null;
    scheduleOpenClawRestart(2000);
  });
  return true;
}

// ---- IPC Handlers ----

// Save server URL from setup page
ipcMain.handle("save-server-url", async (_event, url) => {
  store.set("serverUrl", url);
  loadApp();
  return true;
});

// Get stored config
ipcMain.handle("get-config", async () => {
  return {
    serverUrl: store.get("serverUrl"),
    useLocalOpenClaw: store.get("useLocalOpenClaw"),
    minimizeToTray: store.get("minimizeToTray"),
  };
});

// Update settings
ipcMain.handle("update-settings", async (_event, settings) => {
  for (const [key, value] of Object.entries(settings)) {
    store.set(key, value);
  }
  return true;
});

// Connect bridge (local OpenClaw relay) - called by web app when user is logged in
ipcMain.handle("connect-bridge", async (_event, token) => {
  const serverUrl = store.get("serverUrl");
  const useLocal = store.get("useLocalOpenClaw");
  if (!serverUrl || !useLocal || !token) return false;

  if (bridgeInstance) bridgeInstance.disconnect();
  bridgeInstance = createBridge(serverUrl, {
    localOpenClawPort: () => localOpenClawPort,
    onTaskEvent: persistTaskEvent,
  });
  const ok = await bridgeInstance.connect(token);
  return ok;
});

// Sync workspace from server (arrayBuffer from fetch response)
ipcMain.handle("sync-workspace", async (_event, arrayBuffer) => {
  const workspaceDir = path.join(app.getPath("userData"), "workspace");
  fs.mkdirSync(workspaceDir, { recursive: true });

  const zipPath = path.join(app.getPath("temp"), "creator-workspace-sync.zip");
  fs.writeFileSync(zipPath, Buffer.from(arrayBuffer));
  try {
    await extract(zipPath, { dir: workspaceDir });
    return true;
  } catch (err) {
    console.error("[Sync Workspace]", err);
    return false;
  } finally {
    try { fs.unlinkSync(zipPath); } catch {}
  }
});

// Start local OpenClaw (auto-picks port and auto-recovers on crash)
ipcMain.handle("start-local-openclaw", async () => {
  keepLocalOpenClawAlive = true;
  return startLocalOpenClawInternal();
});

ipcMain.handle("get-local-runtime-status", async () => {
  const taskState = store.get(TASK_STATE_KEY, DEFAULT_TASK_STATE);
  return {
    bridgeConnected: !!(bridgeInstance && bridgeInstance.isConnected && bridgeInstance.isConnected()),
    openclawProcessRunning: !!(openclawProcess && !openclawProcess.killed),
    localOpenClawPort,
    keepLocalOpenClawAlive,
    taskState,
  };
});

ipcMain.handle("run-local-self-check", async () => {
  return runLocalSelfCheck();
});

// Show native notification
ipcMain.handle("show-notification", async (_event, { title, body }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body });
    notification.on("click", () => {
      mainWindow.show();
      mainWindow.focus();
    });
    notification.show();
  }
});

// Open external URL
ipcMain.handle("open-external", async (_event, url) => {
  shell.openExternal(url);
});

// ---- App lifecycle ----

app.whenReady().then(() => {
  // Create application menu
  const template = [
    {
      label: "创作助手",
      submenu: [
        {
          label: "打开控制台",
          accelerator: "CmdOrCtrl+Shift+D",
          click: () => {
            mainWindow.show();
            mainWindow.focus();
          },
        },
        { type: "separator" },
        {
          label: "重新连接服务器",
          accelerator: "CmdOrCtrl+R",
          click: () => loadApp(),
        },
        {
          label: "修改服务器地址",
          click: () => {
            store.set("serverUrl", "");
            loadApp();
          },
        },
        { type: "separator" },
        {
          label: "退出",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Alt+F4",
          click: () => {
            app.isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "刷新" },
        { role: "forceReload", label: "强制刷新" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "重置缩放" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "全屏" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  createWindow();
  tray = createTray(mainWindow, store, app);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
