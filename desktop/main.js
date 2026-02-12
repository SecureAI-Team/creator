// =============================================================================
// 自媒体创作助手 - Electron Main Process
// Lightweight shell that loads the SaaS web dashboard with native features
// =============================================================================

const { app, BrowserWindow, shell, ipcMain, Notification, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");
const Store = require("electron-store");
const { createTray } = require("./tray");
const { createBridge } = require("./bridge");
const extract = require("extract-zip");
const logger = require("./logger");
const { autoUpdater } = require("electron-updater");

// ---- Logger init (must be before first log call) ----
// app.getPath is available after 'ready' but Store already uses userData;
// electron-store picks the path early so we can too.
const userDataPath = app.getPath("userData");
logger.init(userDataPath);
const log = logger.createTaggedLogger("Main");

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
const MAX_OPENCLAW_CRASH_RESTARTS = 5; // Stop restarting after this many consecutive fast crashes

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
    log.info("Window ready-to-show");
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
    const target = serverUrl.replace(/\/+$/, "") + "/overview";
    log.info("Loading server URL:", target);
    mainWindow.loadURL(target).catch((err) => {
      log.warn("Failed to load overview, trying root:", err?.message);
      mainWindow.loadURL(serverUrl).catch((err2) => {
        log.error("Failed to load server root, showing setup:", err2?.message);
        mainWindow.loadFile(path.join(__dirname, "setup.html"));
      });
    });
  } else {
    log.info("No server URL configured, showing setup page");
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

/**
 * Convert an asar-internal path to its unpacked counterpart.
 * Electron's require.resolve() returns paths inside app.asar, but the ESM
 * loader in child processes (ELECTRON_RUN_AS_NODE) cannot read asar archives.
 * Files listed in asarUnpack are extracted to app.asar.unpacked/ alongside app.asar.
 */
function toUnpackedPath(p) {
  return p.replace(/([/\\])app\.asar([/\\])/, "$1app.asar.unpacked$2");
}

function getOpenClawPath() {
  try {
    const pkgPath = require.resolve("openclaw/package.json");
    return toUnpackedPath(path.join(path.dirname(pkgPath), "openclaw.mjs"));
  } catch {
    return toUnpackedPath(path.join(__dirname, "node_modules", "openclaw", "openclaw.mjs"));
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
    openclawCrashCount,
    openclawCrashLimit: MAX_OPENCLAW_CRASH_RESTARTS,
    workspaceDir,
    workspaceWritable,
    openclawPath,
    openclawPathExists: fs.existsSync(openclawPath),
    embeddedRuntime: process.execPath,
  };
}

function scheduleOpenClawRestart(delayMs = 2000) {
  if (!keepLocalOpenClawAlive) return;
  if (openclawCrashCount >= MAX_OPENCLAW_CRASH_RESTARTS) {
    log.error(`OpenClaw crashed ${openclawCrashCount} times consecutively. Giving up auto-restart. Manual intervention required.`);
    // Notify the renderer so the user can see a diagnostic message
    if (mainWindow) {
      mainWindow.webContents.send("openclaw-crash-loop", {
        crashCount: openclawCrashCount,
        message: `本地引擎连续崩溃 ${openclawCrashCount} 次，已停止自动重启。请检查日志或联系支持。`,
      });
    }
    return;
  }
  if (openclawRestartTimer) clearTimeout(openclawRestartTimer);
  openclawRestartTimer = setTimeout(() => {
    openclawRestartTimer = null;
    startLocalOpenClawInternal().catch((err) => {
      log.error("[OpenClaw] auto-restart failed:", err?.message || err);
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
  if (openclawProcess) {
    log.info("OpenClaw already running, skipping start");
    return true;
  }

  const workspaceDir = getWorkspaceDir();
  const openclawPath = getOpenClawPath();
  if (!fs.existsSync(openclawPath)) {
    log.error("OpenClaw binary not found:", openclawPath);
    return false;
  }

  localOpenClawPort = await pickOpenClawPort(3000, 3010);
  const runtimeCmd = process.execPath;
  log.info(`Starting OpenClaw: runtime=${runtimeCmd}, script=${openclawPath}, port=${localOpenClawPort}, cwd=${workspaceDir}`);

  // Compute the unpacked node_modules path so ESM resolver can find dependencies
  const unpackedNodeModules = toUnpackedPath(
    path.join(path.dirname(require.resolve("openclaw/package.json")), "..")
  );
  log.info(`Unpacked node_modules: ${unpackedNodeModules}`);

  try {
    openclawProcess = spawn(runtimeCmd, [openclawPath, "start", "--port", String(localOpenClawPort)], {
      cwd: workspaceDir,
      env: {
        ...process.env,
        OPENCLAW_HOME: workspaceDir,
        ELECTRON_RUN_AS_NODE: "1",
        // Help the ESM resolver find packages in the unpacked directory
        NODE_PATH: unpackedNodeModules,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    openclawStartedAt = Date.now();
  } catch (err) {
    log.error("OpenClaw spawn failed:", err.message);
    openclawProcess = null;
    return false;
  }

  // Capture stdout / stderr into logs
  if (openclawProcess.stdout) {
    openclawProcess.stdout.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      lines.forEach((l) => log.info("[OC:stdout]", l));
    });
  }
  if (openclawProcess.stderr) {
    openclawProcess.stderr.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      lines.forEach((l) => log.warn("[OC:stderr]", l));
    });
  }

  openclawProcess.on("error", (err) => {
    log.error("OpenClaw process error:", err.message);
    openclawProcess = null;
    scheduleOpenClawRestart(3000);
  });
  openclawProcess.on("exit", (code, signal) => {
    const uptimeMs = Date.now() - openclawStartedAt;
    log.warn(`OpenClaw exited: code=${code}, signal=${signal}, uptime=${uptimeMs}ms`);
    if (uptimeMs < 10_000) {
      openclawCrashCount += 1;
    } else {
      openclawCrashCount = 0; // Ran long enough, reset counter
    }
    if (openclawCrashCount === 2) {
      log.warn("OpenClaw crashed twice in quick succession, resetting browser profiles");
      resetBrowserProfiles();
      // Don't reset crashCount — let it keep incrementing toward the max
    }
    openclawProcess = null;
    scheduleOpenClawRestart(2000 + openclawCrashCount * 1000); // Progressive backoff
  });

  log.info("OpenClaw process spawned, pid:", openclawProcess.pid);
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
  log.info(`connect-bridge: serverUrl=${serverUrl}, useLocal=${useLocal}, hasToken=${!!token}`);
  if (!serverUrl || !useLocal || !token) return false;

  // If bridge is already connected, skip reconnect to avoid kick-loop
  if (bridgeInstance && bridgeInstance.isConnected && bridgeInstance.isConnected()) {
    log.info("Bridge already connected, skipping reconnect");
    return true;
  }

  if (bridgeInstance) bridgeInstance.disconnect();
  bridgeInstance = createBridge(serverUrl, {
    localOpenClawPort: () => localOpenClawPort,
    onTaskEvent: persistTaskEvent,
    logger: logger.createTaggedLogger("Bridge"),
  });
  const ok = await bridgeInstance.connect(token);
  log.info("Bridge connect result:", ok);
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
    openclawCrashCount,
    openclawCrashLimit: MAX_OPENCLAW_CRASH_RESTARTS,
    taskState,
  };
});

ipcMain.handle("run-local-self-check", async () => {
  return runLocalSelfCheck();
});

// Manual retry after crash loop - resets counter and tries again
ipcMain.handle("restart-openclaw", async () => {
  log.info("Manual OpenClaw restart requested, resetting crash counter");
  openclawCrashCount = 0;
  keepLocalOpenClawAlive = true;
  if (openclawProcess) {
    try { openclawProcess.kill(); } catch {}
    openclawProcess = null;
  }
  return startLocalOpenClawInternal();
});

// ---- App version IPC ----
ipcMain.handle("get-app-version", () => app.getVersion());

// ---- Logs IPC ----
ipcMain.handle("get-logs", async (_event, count) => {
  return logger.getLogs(typeof count === "number" ? count : 200);
});
ipcMain.handle("get-log-file-path", async () => {
  return logger.getLogFilePath();
});
ipcMain.handle("open-log-folder", async () => {
  const logPath = logger.getLogFilePath();
  if (logPath) shell.showItemInFolder(logPath);
});

// ---- Auto-update IPC ----
ipcMain.handle("check-for-update", async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { available: !!result?.updateInfo, version: result?.updateInfo?.version || null };
  } catch (err) {
    log.warn("check-for-update error:", err?.message);
    return { available: false, error: err?.message };
  }
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

  // ---- Auto-updater ----
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = logger.createTaggedLogger("AutoUpdate");

  autoUpdater.on("checking-for-update", () => log.info("Checking for update..."));
  autoUpdater.on("update-available", (info) => {
    log.info("Update available:", info?.version);
    if (mainWindow) {
      mainWindow.webContents.send("update-available", { version: info?.version });
    }
  });
  autoUpdater.on("update-not-available", () => log.info("App is up to date"));
  autoUpdater.on("download-progress", (progress) => {
    log.debug(`Download progress: ${Math.round(progress.percent)}%`);
  });
  autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded:", info?.version);
    if (Notification.isSupported()) {
      const n = new Notification({
        title: "更新已就绪",
        body: `v${info?.version} 已下载完成，下次启动时自动安装。点击立即重启。`,
      });
      n.on("click", () => autoUpdater.quitAndInstall());
      n.show();
    }
    if (mainWindow) {
      mainWindow.webContents.send("update-downloaded", { version: info?.version });
    }
  });
  autoUpdater.on("error", (err) => log.error("AutoUpdate error:", err?.message));

  // Check for updates after a short delay (don't block startup)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.warn("Auto-update check failed:", err?.message);
    });
  }, 10_000);
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
