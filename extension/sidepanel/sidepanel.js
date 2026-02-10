/**
 * 创作助手 - Side Panel Chat
 *
 * Full AI assistant chat in the browser side panel.
 */

const messagesContainer = document.getElementById("messages");
const input = document.getElementById("input");
const btnSend = document.getElementById("btn-send");
const btnContext = document.getElementById("btn-context");
const btnClear = document.getElementById("btn-clear");
const contextBanner = document.getElementById("context-banner");
const contextText = document.getElementById("context-text");
const btnDismissContext = document.getElementById("btn-dismiss-context");

let pageContext = null;

// Auto-resize textarea
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
  btnSend.disabled = !input.value.trim();
});

// Send on Enter (Shift+Enter for newline)
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (input.value.trim()) sendChat();
  }
});

btnSend.addEventListener("click", () => {
  if (input.value.trim()) sendChat();
});

// Get page context
btnContext.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_CONTEXT" }, (context) => {
    if (chrome.runtime.lastError || !context) {
      addMessage("assistant", "无法获取当前页面内容（可能是浏览器内部页面）");
      return;
    }

    pageContext = context;
    contextBanner.classList.remove("hidden");
    contextText.textContent = `📄 ${context.title || context.url}`;

    if (context.selectedText) {
      contextText.textContent += ` (选中: "${context.selectedText.slice(0, 50)}...")`;
    }
  });
});

// Dismiss context
btnDismissContext.addEventListener("click", () => {
  pageContext = null;
  contextBanner.classList.add("hidden");
});

// Clear chat
btnClear.addEventListener("click", () => {
  messagesContainer.innerHTML = "";
  pageContext = null;
  contextBanner.classList.add("hidden");
  addMessage(
    "assistant",
    "对话已清空。有什么可以帮你的？"
  );
});

// Check for stored page context (from popup "页面助手")
chrome.storage.session?.get?.("pageContext", (result) => {
  if (result?.pageContext) {
    pageContext = result.pageContext;
    contextBanner.classList.remove("hidden");
    contextText.textContent = `📄 ${pageContext.title || pageContext.url}`;
    chrome.storage.session.remove("pageContext");
  }
});

async function sendChat() {
  const text = input.value.trim();
  if (!text) return;

  // Build message with context
  let message = text;
  if (pageContext) {
    message = `[页面上下文] URL: ${pageContext.url}\n标题: ${pageContext.title}`;
    if (pageContext.selectedText) {
      message += `\n选中文本: ${pageContext.selectedText}`;
    }
    if (pageContext.content) {
      message += `\n页面内容摘要: ${pageContext.content.slice(0, 500)}`;
    }
    message += `\n\n用户问题: ${text}`;
  }

  addMessage("user", text);
  input.value = "";
  input.style.height = "auto";
  btnSend.disabled = true;

  // Add loading message
  const loadingEl = addMessage("assistant", "正在思考...", true);

  try {
    const response = await sendToAgent(message);
    loadingEl.remove();
    addMessage("assistant", response || "（无回复）");
  } catch (err) {
    loadingEl.remove();
    addMessage("assistant", `出错了: ${err.message || "请检查设置"}`);
  }
}

async function sendToAgent(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "API_REQUEST",
        endpoint: "/api/agent",
        options: {
          method: "POST",
          body: JSON.stringify({ message }),
        },
      },
      (response) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response?.reply || response?.message || JSON.stringify(response));
        }
      }
    );
  });
}

function addMessage(role, text, isLoading = false) {
  const div = document.createElement("div");
  div.className = `message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `message-bubble${isLoading ? " loading" : ""}`;
  bubble.textContent = text;

  div.appendChild(bubble);
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return div;
}
