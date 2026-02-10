/**
 * 创作助手 - Popup Script
 */

document.addEventListener("DOMContentLoaded", async () => {
  const loginPrompt = document.getElementById("login-prompt");
  const mainContent = document.getElementById("main-content");

  // Check auth status
  const auth = await sendMessage({ type: "GET_AUTH" });

  if (!auth?.token || !auth?.serverUrl) {
    loginPrompt.classList.remove("hidden");
    mainContent.classList.add("hidden");

    document.getElementById("btn-options").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  loginPrompt.classList.add("hidden");
  mainContent.classList.remove("hidden");

  // Load status data
  loadStatus(auth.serverUrl);

  // Check platform context
  checkPlatformContext();

  // Button handlers
  document.getElementById("btn-settings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("btn-chat").addEventListener("click", () => {
    // Open side panel for chat
    chrome.sidePanel?.open?.({ windowId: undefined });
  });

  document.getElementById("btn-create").addEventListener("click", () => {
    chrome.tabs.create({ url: `${auth.serverUrl}/chat?action=create` });
  });

  document.getElementById("btn-dashboard").addEventListener("click", () => {
    chrome.tabs.create({ url: `${auth.serverUrl}/overview` });
  });

  document.getElementById("btn-page-assist").addEventListener("click", async () => {
    // Extract current page context and open side panel
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_CONTEXT" }, (context) => {
        if (context) {
          chrome.storage.session?.set?.({ pageContext: context });
        }
        chrome.sidePanel?.open?.({ windowId: undefined });
      });
    }
  });
});

async function loadStatus(serverUrl) {
  try {
    const data = await sendMessage({
      type: "API_REQUEST",
      endpoint: "/api/data?days=7",
    });

    if (!data?.error) {
      const connectedPlatforms = (data.platforms || []).filter(
        (p) => p.status === "CONNECTED"
      ).length;

      document.getElementById("stat-platforms").textContent = connectedPlatforms;
      document.getElementById("stat-views").textContent = formatNumber(
        data.totals?.views || 0
      );

      // Get content count
      const contentData = await sendMessage({
        type: "API_REQUEST",
        endpoint: "/api/content?pageSize=1",
      });
      document.getElementById("stat-content").textContent =
        contentData?.total || 0;
    }
  } catch {
    // Status load failed silently
  }
}

async function checkPlatformContext() {
  const result = await chrome.storage.session?.get?.("detectedPlatform");
  const platform = result?.detectedPlatform;

  if (platform) {
    const platformNames = {
      bilibili: "B站",
      douyin: "抖音",
      xiaohongshu: "小红书",
      youtube: "YouTube",
      "weixin-mp": "公众号",
      "weixin-channels": "视频号",
      kuaishou: "快手",
      zhihu: "知乎",
      weibo: "微博",
      toutiao: "头条号",
    };

    const ctx = document.getElementById("platform-context");
    ctx.classList.remove("hidden");
    document.getElementById("context-platform-name").textContent =
      platformNames[platform] || platform;

    document.getElementById("btn-check-data").addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "API_REQUEST",
        endpoint: `/api/data?platform=${platform}&days=7`,
      });
      // Open side panel to show results
      chrome.sidePanel?.open?.({ windowId: undefined });
    });

    document.getElementById("btn-check-comments").addEventListener("click", () => {
      chrome.sidePanel?.open?.({ windowId: undefined });
    });
  }
}

function formatNumber(num) {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return String(num);
}

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, resolve);
  });
}
