// =============================================================================
// System tray with quick actions
// =============================================================================

const { Tray, Menu, nativeImage } = require("electron");
const path = require("path");

function createTray(mainWindow, store, app) {
  // Use a small icon for tray
  const iconPath = path.join(
    __dirname,
    "assets",
    process.platform === "win32" ? "icon.ico" : "icon.png"
  );

  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      // Fallback: create a simple 16x16 icon
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  const tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "打开控制台",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: "AI 对话",
      click: () => {
        const serverUrl = store.get("serverUrl");
        if (serverUrl) {
          mainWindow.loadURL(`${serverUrl}/chat`);
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "数据概览",
      click: () => {
        const serverUrl = store.get("serverUrl");
        if (serverUrl) {
          mainWindow.loadURL(`${serverUrl}/overview`);
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "内容管理",
      click: () => {
        const serverUrl = store.get("serverUrl");
        if (serverUrl) {
          mainWindow.loadURL(`${serverUrl}/content`);
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "修改服务器地址",
      click: () => {
        store.set("serverUrl", "");
        mainWindow.loadFile(path.join(__dirname, "setup.html"));
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("创作助手");
  tray.setContextMenu(contextMenu);

  // Double-click to show window
  tray.on("double-click", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}

module.exports = { createTray };
