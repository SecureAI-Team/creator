/**
 * 创作助手 - Content Script
 *
 * Runs on all pages to extract page context for the AI assistant.
 * Extracts: title, URL, selected text, meta tags, main content.
 */

// Listen for context extraction requests
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_CONTEXT") {
    const context = extractPageContext();
    sendResponse(context);
  }
  return true;
});

function extractPageContext() {
  const context = {
    url: window.location.href,
    title: document.title,
    selectedText: window.getSelection()?.toString()?.trim() || "",
    meta: {},
    content: "",
  };

  // Extract meta tags
  const metaTags = document.querySelectorAll("meta");
  metaTags.forEach((tag) => {
    const name =
      tag.getAttribute("name") ||
      tag.getAttribute("property") ||
      tag.getAttribute("itemprop");
    const content = tag.getAttribute("content");
    if (name && content) {
      context.meta[name] = content;
    }
  });

  // Extract main content (simplified)
  const selectors = [
    "article",
    "[role='main']",
    "main",
    ".post-content",
    ".article-content",
    ".entry-content",
    "#content",
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      context.content = el.innerText?.slice(0, 2000) || "";
      break;
    }
  }

  // Fallback: first 1000 chars of body text
  if (!context.content) {
    context.content = document.body?.innerText?.slice(0, 1000) || "";
  }

  return context;
}

// Detect if current page is a supported platform
function detectPlatform() {
  const url = window.location.href;
  const platforms = [
    { pattern: /bilibili\.com/, key: "bilibili", name: "B站" },
    { pattern: /douyin\.com/, key: "douyin", name: "抖音" },
    { pattern: /xiaohongshu\.com/, key: "xiaohongshu", name: "小红书" },
    { pattern: /youtube\.com/, key: "youtube", name: "YouTube" },
    { pattern: /mp\.weixin\.qq\.com/, key: "weixin-mp", name: "公众号" },
    { pattern: /zhihu\.com/, key: "zhihu", name: "知乎" },
    { pattern: /weibo\.com/, key: "weibo", name: "微博" },
  ];

  for (const p of platforms) {
    if (p.pattern.test(url)) {
      return p;
    }
  }
  return null;
}

// Expose detected platform to other scripts
const detected = detectPlatform();
if (detected) {
  chrome.runtime.sendMessage({
    type: "PLATFORM_DETECTED",
    platform: detected,
  });
}
