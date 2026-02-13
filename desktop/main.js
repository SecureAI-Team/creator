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
let localGatewayToken = null;
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

// OpenClaw version to install at runtime (keep in sync with tested version)
const OPENCLAW_VERSION = "2026.2.9";

/**
 * Get the path to openclaw.mjs inside the workspace's local node_modules.
 * OpenClaw is NOT bundled with the Electron app — it's installed at runtime
 * by the system Node.js into the workspace directory so that npm can properly
 * resolve its full dependency tree (600+ packages).
 */
function getOpenClawPath() {
  const workspaceDir = getWorkspaceDir();
  return path.join(workspaceDir, "node_modules", "openclaw", "openclaw.mjs");
}

/**
 * Locate system Node.js binary (>= 22.12.0) for running OpenClaw.
 * Electron 33 bundles Node 20.18 but OpenClaw requires >=22.12.0,
 * so we MUST use a separately-installed Node.js.
 */
function findSystemNode() {
  const { execFileSync } = require("child_process");
  const isWin = process.platform === "win32";

  // 1. Try common well-known locations first (fast)
  const candidates = isWin
    ? [
        path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "node.exe"),
        path.join(process.env.LOCALAPPDATA || "", "fnm_multishells", "node.exe"),
      ]
    : ["/usr/local/bin/node", "/usr/bin/node"];

  // 2. Also try to resolve from PATH using `where` / `which`
  try {
    const cmd = isWin ? "where" : "which";
    const result = execFileSync(cmd, ["node"], {
      timeout: 5000,
      encoding: "utf-8",
      env: process.env,
      windowsHide: true,
    }).trim();
    // `where` on Windows may return multiple lines; take the first
    const lines = result.split(/\r?\n/).filter(Boolean);
    for (const l of lines) {
      if (!candidates.includes(l)) candidates.unshift(l); // prioritise PATH result
    }
  } catch {
    // ignore - we'll try candidates directly
  }

  // 3. Check each candidate version
  for (const nodePath of candidates) {
    if (!nodePath || !fs.existsSync(nodePath)) continue;
    try {
      const ver = execFileSync(nodePath, ["--version"], {
        timeout: 5000,
        encoding: "utf-8",
        windowsHide: true,
      }).trim(); // e.g. "v22.13.1"
      const match = ver.match(/^v(\d+)\.(\d+)\.(\d+)/);
      if (!match) continue;
      const [, major, minor] = match.map(Number);
      if (major > 22 || (major === 22 && minor >= 12)) {
        log.info(`Found system Node ${ver} at ${nodePath}`);
        return nodePath;
      }
      log.info(`Skipping Node ${ver} at ${nodePath} (need >=22.12.0)`);
    } catch {
      // Can't run this candidate, skip
    }
  }
  return null; // Not found
}

/**
 * Ensure OpenClaw config exists with DashScope/Qwen provider (OpenAI-compatible)
 * and browser automation enabled.
 * Creates/updates {workspaceDir}/.openclaw/openclaw.json and workspace AGENTS.md.
 *
 * @param {string} workspaceDir
 * @param {{ port?: number, token?: string }} [gatewayOpts] - gateway port & token
 */
function ensureOpenClawConfig(workspaceDir, gatewayOpts) {
  const configDir = path.join(workspaceDir, ".openclaw");
  const configPath = path.join(configDir, "openclaw.json");

  fs.mkdirSync(configDir, { recursive: true });

  // Resolve actual API key value: electron-store > env var > placeholder
  // We write the real value so that ALL processes (gateway, CLI browser commands)
  // can read the config without needing the env var to be set.
  const dashscopeKey = store.get("dashscopeApiKey") || process.env.DASHSCOPE_API_KEY || "";

  const config = {
    gateway: {
      port: gatewayOpts?.port || 3000,
      auth: {
        mode: "token",
        token: gatewayOpts?.token || "",
      },
    },
    agents: {
      defaults: {
        model: { primary: "dashscope/qwen-max-latest" },
      },
    },
    browser: {
      enabled: true,
      defaultProfile: "openclaw",
      headless: false,
    },
    models: {
      mode: "merge",
      providers: {
        dashscope: {
          baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          apiKey: dashscopeKey,
          api: "openai-completions",
          models: [
            { id: "qwen-max-latest", name: "Qwen Max" },
            { id: "qwen-plus-latest", name: "Qwen Plus" },
            { id: "qwen-turbo-latest", name: "Qwen Turbo" },
          ],
        },
      },
    },
  };

  // Always write config to ensure latest settings (browser config, gateway port, etc.)
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  log.info("Written OpenClaw config:", configPath, gatewayOpts?.port ? `(gateway port: ${gatewayOpts.port})` : "");

  // Create workspace AGENTS.md with platform login instructions
  ensureAgentsFile(workspaceDir);
}

/**
 * Create AGENTS.md in the workspace to instruct the AI agent
 * how to handle platform login and status commands.
 */
function ensureAgentsFile(workspaceDir) {
  const agentsPath = path.join(workspaceDir, "AGENTS.md");

  // Always update to latest version
  const content = `# Creator Desktop Agent

## 核心指令

你是一个自媒体平台自动化助手。你的主要任务是帮助用户登录各个自媒体平台。

## 处理 /login 命令

当你收到 \`/login <平台名>\` 消息时，你**必须**立即使用浏览器工具执行以下操作：

1. 使用 browser 工具打开对应平台的登录页面
2. 告知用户在弹出的浏览器窗口中完成登录

**平台 URL 映射（必须严格遵守）：**

| 平台名 | 登录 URL |
|--------|----------|
| bilibili | https://passport.bilibili.com/login |
| douyin | https://creator.douyin.com |
| xiaohongshu | https://creator.xiaohongshu.com |
| youtube | https://studio.youtube.com |
| weixin-mp | https://mp.weixin.qq.com |
| weixin-channels | https://channels.weixin.qq.com |
| kuaishou | https://cp.kuaishou.com |
| zhihu | https://www.zhihu.com/signin |
| weibo | https://weibo.com/login |
| toutiao | https://mp.toutiao.com |

**关键：** 收到 /login 命令后，不要只回复文字说明。你**必须**调用浏览器工具打开 URL。

## 处理 /status 命令

当你收到 \`/status <平台名>\` 消息时：
1. 检查浏览器中是否有该平台的已打开页面
2. 如果有，报告当前页面状态
3. 如果没有，报告该平台未登录

## 浏览器使用规则

- 始终使用 openclaw 浏览器配置文件（不是用户的个人浏览器）
- 打开页面后等待用户完成登录操作
- 不要尝试自动输入用户名密码（这会触发反机器人防御）
`;

  fs.writeFileSync(agentsPath, content, "utf-8");
  log.info("Written workspace AGENTS.md:", agentsPath);
}

/**
 * Ensure openclaw is installed in the workspace directory.
 * Uses the system Node.js + npm to install it with all transitive dependencies.
 * Returns true if openclaw is ready, false otherwise.
 */
async function ensureOpenClawInstalled(systemNode) {
  const workspaceDir = getWorkspaceDir();
  const openclawPath = getOpenClawPath();
  const pkgJsonPath = path.join(workspaceDir, "node_modules", "openclaw", "package.json");

  // Check if already installed with correct version
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      if (pkg.version === OPENCLAW_VERSION) {
        log.info(`OpenClaw ${OPENCLAW_VERSION} already installed in workspace`);
        ensureOpenClawConfig(workspaceDir);
        return true;
      }
      log.info(`OpenClaw version mismatch: installed=${pkg.version}, need=${OPENCLAW_VERSION}`);
    } catch {
      // corrupt package.json, reinstall
    }
  }

  log.info(`Installing openclaw@${OPENCLAW_VERSION} into workspace: ${workspaceDir}`);
  if (mainWindow) {
    mainWindow.webContents.send("openclaw-crash-loop", {
      crashCount: 0,
      message: `正在安装本地引擎 (openclaw@${OPENCLAW_VERSION})，首次启动需要 1-2 分钟...`,
    });
  }

  // Find npm alongside system node
  const { execSync } = require("child_process");
  const isWin = process.platform === "win32";

  // Create a minimal package.json in workspace if it doesn't exist
  const wsPkgJson = path.join(workspaceDir, "package.json");
  if (!fs.existsSync(wsPkgJson)) {
    fs.writeFileSync(wsPkgJson, JSON.stringify({ name: "creator-workspace", private: true }, null, 2));
  }

  try {
    // Use shell: true via execSync so that .cmd files and paths with spaces work on Windows
    // Use China npm mirror for faster downloads
    const registry = "--registry=https://registry.npmmirror.com";
    const cmd = `npm install openclaw@${OPENCLAW_VERSION} ${registry} --no-audit --no-fund`;
    log.info(`Running: ${cmd} (cwd: ${workspaceDir})`);
    const result = execSync(cmd, {
      cwd: workspaceDir,
      timeout: 600_000, // 10 minutes max
      encoding: "utf-8",
      env: { ...process.env, NODE_ENV: "production" },
      windowsHide: true,
    });
    log.info("npm install output:", result.trim().slice(0, 500));

    // Ensure OpenClaw config exists (DashScope/Qwen via OpenAI-compatible API)
    ensureOpenClawConfig(workspaceDir);

    return fs.existsSync(openclawPath);
  } catch (err) {
    log.error("Failed to install openclaw:", err?.stderr?.slice(0, 500) || err?.message || err);
    if (mainWindow) {
      mainWindow.webContents.send("openclaw-crash-loop", {
        crashCount: 0,
        message: `安装本地引擎失败: ${err?.message?.slice(0, 200) || "未知错误"}`,
      });
    }
    return false;
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

/**
 * Quick TCP probe to check if a port is open.
 * Used to verify OpenClaw has started listening.
 */
function probePort(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ port, host: "127.0.0.1" });
    const timer = setTimeout(() => {
      sock.destroy();
      resolve(false);
    }, timeoutMs);
    sock.on("connect", () => {
      clearTimeout(timer);
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

/**
 * Wait for OpenClaw to become reachable on its port.
 * Polls every intervalMs, up to maxWaitMs total.
 */
async function waitForOpenClawReady(port, maxWaitMs = 15000, intervalMs = 1500) {
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    if (await probePort(port, 1200)) {
      log.info(`OpenClaw is reachable on port ${port} after ${attempt} probe(s)`);
      return true;
    }
    // Check if the process died
    if (!openclawProcess || openclawProcess.killed) {
      log.warn("OpenClaw process exited while waiting for readiness");
      return false;
    }
    const remaining = deadline - Date.now();
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, Math.min(intervalMs, remaining)));
    }
  }
  log.warn(`OpenClaw NOT reachable on port ${port} after ${maxWaitMs}ms`);
  return false;
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
    openclawVersion: OPENCLAW_VERSION,
    systemNode: findSystemNode() || "(not found - need >=22.12.0)",
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

  // ---- 1. Find system Node.js >= 22.12.0 ----
  const systemNode = findSystemNode();
  if (!systemNode) {
    log.warn("System Node.js >= 22.12.0 not found! OpenClaw requires Node 22+.");
    log.warn("Please install Node.js >= 22.12.0 from https://nodejs.org/en/download");
    if (mainWindow) {
      mainWindow.webContents.send("openclaw-crash-loop", {
        crashCount: 0,
        message: "未找到 Node.js >= 22.12.0。本地引擎需要 Node.js 22 以上版本才能运行。\n请从 https://nodejs.org 安装 Node.js 22，然后重启客户端。",
      });
    }
    return false;
  }

  // ---- 2. Ensure openclaw is installed in workspace ----
  const installed = await ensureOpenClawInstalled(systemNode);
  if (!installed) {
    log.error("OpenClaw installation failed");
    return false;
  }

  const workspaceDir = getWorkspaceDir();
  const openclawPath = getOpenClawPath();
  localOpenClawPort = await pickOpenClawPort(3000, 3010);

  // Generate a local gateway token (stored at module level for bridge access)
  localGatewayToken = `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const gatewayToken = localGatewayToken;

  // Re-write config with the actual gateway port & token so that CLI commands
  // (browser open, browser cookies, etc.) can connect to the running gateway
  ensureOpenClawConfig(workspaceDir, { port: localOpenClawPort, token: gatewayToken });

  const runtimeEnv = {
    ...process.env,
    OPENCLAW_HOME: workspaceDir,
    OPENCLAW_NO_RESPAWN: "1",
  };
  delete runtimeEnv.ELECTRON_RUN_AS_NODE;

  // Inject DASHSCOPE_API_KEY from electron-store (user setting) or environment
  const storedApiKey = store.get("dashscopeApiKey");
  if (storedApiKey) {
    runtimeEnv.DASHSCOPE_API_KEY = storedApiKey;
    log.info("Using DASHSCOPE_API_KEY from app settings");
  } else if (runtimeEnv.DASHSCOPE_API_KEY) {
    log.info("Using DASHSCOPE_API_KEY from system environment");
  } else {
    log.warn("DASHSCOPE_API_KEY not set! OpenClaw agent calls will fail. Set it via settings or environment variable.");
  }

  log.info(`Starting OpenClaw: node=${systemNode}, script=${openclawPath}, port=${localOpenClawPort}`);

  try {
    openclawProcess = spawn(systemNode, [
      openclawPath,
      "gateway",
      "--port", String(localOpenClawPort),
      "--allow-unconfigured",
      "--token", gatewayToken,
    ], {
      cwd: workspaceDir,
      env: runtimeEnv,
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

  // Wait for OpenClaw to actually start listening before declaring success
  const ready = await waitForOpenClawReady(localOpenClawPort, 20000, 1500);
  if (ready) {
    log.info("OpenClaw is ready and accepting connections");
  } else {
    log.warn("OpenClaw spawned but did not become reachable within timeout");
  }
  return ready;
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

  // If bridge is already connected with a healthy connection, skip to avoid kick-loop
  if (bridgeInstance && bridgeInstance.isConnected && bridgeInstance.isConnected()) {
    log.info("Bridge already connected with valid token, skipping reconnect");
    return true;
  }

  // Disconnect existing bridge (cleans up old WS and timers)
  if (bridgeInstance) {
    log.info("Disconnecting old bridge before reconnect with fresh token");
    bridgeInstance.disconnect();
  }

  bridgeInstance = createBridge(serverUrl, {
    localOpenClawPort: () => localOpenClawPort,
    localGatewayToken: () => localGatewayToken,
    onTaskEvent: persistTaskEvent,
    onPublish: async (platform, payload) => {
      log.info(`Publishing to ${platform}: "${payload.title}"`);
      const { publishToPlatform } = require("./platform-scripts");
      const sysNode = findSystemNode();
      const ocPath = getOpenClawPath();
      const wsDir = getWorkspaceDir();
      if (!sysNode || !fs.existsSync(ocPath)) {
        throw new Error("OpenClaw or system Node.js not available");
      }
      return await publishToPlatform(platform, payload, { systemNode: sysNode, openclawPath: ocPath, workspaceDir: wsDir });
    },
    onDataRefresh: async (platform) => {
      log.info(`Data refresh for: ${platform}`);
      const { collectPlatformData } = require("./platform-scripts");
      const sysNode = findSystemNode();
      const ocPath = getOpenClawPath();
      const wsDir = getWorkspaceDir();
      if (!sysNode || !fs.existsSync(ocPath)) {
        throw new Error("OpenClaw or system Node.js not available");
      }
      return await collectPlatformData(platform, { systemNode: sysNode, openclawPath: ocPath, workspaceDir: wsDir });
    },
    onCheckCookies: async (domain) => {
      log.info(`Checking browser cookies via OpenClaw CLI${domain ? ` for ${domain}` : ""}...`);
      const sysNode = findSystemNode();
      const ocPath = getOpenClawPath();
      if (!sysNode || !fs.existsSync(ocPath)) {
        log.warn("OpenClaw or system Node.js not available for cookie check");
        return [];
      }
      try {
        const { execSync } = require("child_process");
        const wsDir = getWorkspaceDir();
        // NOTE: --url is NOT a cookie domain filter — it overrides the gateway URL.
        // Just use plain `browser cookies --json` which returns all cookies from the profile.
        const cmd = `"${sysNode}" "${ocPath}" browser cookies --browser-profile openclaw --json`;
        log.info(`Exec: ${cmd}`);
        const apiKey = store.get("dashscopeApiKey") || process.env.DASHSCOPE_API_KEY || "";
        const result = execSync(cmd, {
          timeout: 15000,
          stdio: "pipe",
          windowsHide: true,
          cwd: wsDir,
          env: { ...process.env, OPENCLAW_HOME: wsDir, DASHSCOPE_API_KEY: apiKey },
        });
        const output = result.toString().trim();
        log.info(`CLI cookies raw output (${output.length} chars): ${output.substring(0, 500)}`);
        // Try to parse: might be JSON array or JSON object with cookies field
        let cookies = [];
        try {
          const parsed = JSON.parse(output);
          cookies = Array.isArray(parsed) ? parsed : (parsed?.cookies || []);
        } catch {
          log.warn("CLI cookies output is not valid JSON");
        }
        log.info(`Retrieved ${cookies.length} cookies from OpenClaw browser`);
        return cookies;
      } catch (err) {
        log.error(`Cookie check failed: ${err.message}`);
        return [];
      }
    },
    onOpenUrl: async (url) => {
      log.info(`Opening URL in OpenClaw managed browser: ${url}`);
      const sysNode = findSystemNode();
      if (!sysNode) {
        log.warn("System Node.js not found, falling back to default browser");
        await shell.openExternal(url);
        return;
      }
      const ocPath = getOpenClawPath();
      if (!fs.existsSync(ocPath)) {
        log.warn("OpenClaw not installed, falling back to default browser");
        await shell.openExternal(url);
        return;
      }
      const { execSync } = require("child_process");
      const wsDir = getWorkspaceDir();
      const apiKey = store.get("dashscopeApiKey") || process.env.DASHSCOPE_API_KEY || "";
      const execOpts = {
        timeout: 30000,
        stdio: "pipe",
        windowsHide: true,
        cwd: wsDir,
        env: { ...process.env, OPENCLAW_HOME: wsDir, DASHSCOPE_API_KEY: apiKey },
      };

      // Try `browser navigate` first (reuses existing tab, no empty tab issue).
      // Falls back to `browser open` if navigate fails (browser not started yet).
      try {
        const navCmd = `"${sysNode}" "${ocPath}" browser navigate "${url}" --browser-profile openclaw`;
        log.info(`Exec (navigate): ${navCmd}`);
        execSync(navCmd, execOpts);
        log.info("OpenClaw browser navigated successfully");
      } catch {
        // Navigate failed — browser may not be running. Use `open` which starts it.
        try {
          const openCmd = `"${sysNode}" "${ocPath}" browser open "${url}" --browser-profile openclaw`;
          log.info(`Exec (open): ${openCmd}`);
          execSync(openCmd, execOpts);
          log.info("OpenClaw browser opened successfully");
        } catch (err) {
          log.error(`OpenClaw browser open failed: ${err.message}, falling back to default browser`);
          await shell.openExternal(url);
        }
      }
    },
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

// ---- API Key management IPC ----
ipcMain.handle("set-api-key", async (_event, { provider, key }) => {
  if (provider === "dashscope") {
    store.set("dashscopeApiKey", key || "");
    log.info(`DashScope API key ${key ? "saved" : "cleared"} in settings`);

    // Restart OpenClaw so it picks up the new API key in its environment
    if (openclawProcess) {
      log.info("Restarting OpenClaw to apply new API key...");
      openclawCrashCount = 0;
      keepLocalOpenClawAlive = true;
      try { openclawProcess.kill(); } catch {}
      // Give the old process a moment to exit, then restart
      setTimeout(() => {
        startLocalOpenClawInternal().then(result => {
          log.info("OpenClaw restart after API key change:", result ? "success" : "failed");
        }).catch(err => {
          log.error("OpenClaw restart after API key change error:", err.message);
        });
      }, 1500);
    }

    return true;
  }
  return false;
});

ipcMain.handle("get-api-key-status", async () => {
  return {
    dashscope: !!store.get("dashscopeApiKey"),
    dashscopeFromEnv: !!process.env.DASHSCOPE_API_KEY,
  };
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
