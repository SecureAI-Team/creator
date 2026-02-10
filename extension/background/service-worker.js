/**
 * 创作助手 - Background Service Worker
 *
 * Handles:
 * - Auth token management
 * - Badge status updates
 * - Notification handling
 * - Side panel management
 */

// Open side panel when extension icon is clicked (if supported)
chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false });

// Listen for messages from popup, sidepanel, content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "GET_AUTH":
      getAuth().then(sendResponse);
      return true; // async response

    case "SET_AUTH":
      setAuth(message.token, message.serverUrl).then(() =>
        sendResponse({ ok: true })
      );
      return true;

    case "LOGOUT":
      chrome.storage.local.remove(["authToken", "serverUrl"], () =>
        sendResponse({ ok: true })
      );
      updateBadge("");
      return true;

    case "API_REQUEST":
      apiRequest(message.endpoint, message.options).then(sendResponse);
      return true;

    case "GET_PAGE_CONTEXT":
      // Forward to content script
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: "EXTRACT_CONTEXT" }, sendResponse);
      }
      return true;

    case "CHECK_PLATFORM_STATUS":
      checkPlatformStatus().then(sendResponse);
      return true;
  }
});

// Auth token management
async function getAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["authToken", "serverUrl"], (result) => {
      resolve({
        token: result.authToken || null,
        serverUrl: result.serverUrl || "",
      });
    });
  });
}

async function setAuth(token, serverUrl) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ authToken: token, serverUrl }, resolve);
  });
}

// API request helper
async function apiRequest(endpoint, options = {}) {
  const auth = await getAuth();
  if (!auth.token || !auth.serverUrl) {
    return { error: "Not authenticated" };
  }

  try {
    const url = `${auth.serverUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    return await response.json();
  } catch (err) {
    return { error: err.message };
  }
}

// Check platform status and update badge
async function checkPlatformStatus() {
  const data = await apiRequest("/api/data?days=1");
  if (data.error) return data;

  const expired = (data.platforms || []).filter(
    (p) => p.status === "EXPIRED"
  ).length;

  if (expired > 0) {
    updateBadge(String(expired));
    chrome.notifications.create("platform-expired", {
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title: "平台登录过期",
      message: `${expired} 个平台的登录已过期，请重新登录`,
    });
  } else {
    updateBadge("");
  }

  return data;
}

function updateBadge(text) {
  chrome.action.setBadgeText({ text });
  if (text) {
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
  }
}

// Periodic status check (every 30 minutes)
chrome.alarms?.create?.("check-status", { periodInMinutes: 30 });
chrome.alarms?.onAlarm?.addListener?.((alarm) => {
  if (alarm.name === "check-status") {
    checkPlatformStatus();
  }
});

// Auto-detect platform pages
chrome.tabs?.onUpdated?.addListener?.((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  const platformPatterns = [
    { pattern: /bilibili\.com/, key: "bilibili" },
    { pattern: /douyin\.com/, key: "douyin" },
    { pattern: /xiaohongshu\.com/, key: "xiaohongshu" },
    { pattern: /youtube\.com/, key: "youtube" },
    { pattern: /mp\.weixin\.qq\.com/, key: "weixin-mp" },
    { pattern: /channels\.weixin\.qq\.com/, key: "weixin-channels" },
    { pattern: /kuaishou\.com/, key: "kuaishou" },
    { pattern: /zhihu\.com/, key: "zhihu" },
    { pattern: /weibo\.com/, key: "weibo" },
    { pattern: /toutiao\.com/, key: "toutiao" },
  ];

  for (const { pattern, key } of platformPatterns) {
    if (pattern.test(tab.url)) {
      // Store current detected platform for popup context
      chrome.storage.session?.set?.({ detectedPlatform: key });
      break;
    }
  }
});
