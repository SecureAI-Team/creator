// =============================================================================
// 自媒体创作助手 - Electron Main Process
// Lightweight shell that loads the SaaS web dashboard with native features
// =============================================================================

const { app, BrowserWindow, shell, ipcMain, Notification, Menu } = require("electron");
const path = require("path");
const Store = require("electron-store");
const { createTray } = require("./tray");

const store = new Store({
  defaults: {
    serverUrl: "",
    windowBounds: { width: 1280, height: 800 },
    minimizeToTray: true,
  },
});

let mainWindow = null;
let tray = null;

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
    mainWindow.loadURL(serverUrl).catch(() => {
      mainWindow.loadFile(path.join(__dirname, "setup.html"));
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
