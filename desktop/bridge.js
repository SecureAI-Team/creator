/**
 * Bridge client - WebSocket connection to server for local OpenClaw relay.
 * Forwards agent messages from server to local OpenClaw (localhost:3000).
 */

const WebSocket = require("ws");

/** @param {string} serverUrl - Base URL (e.g. https://example.com) */
function createBridge(serverUrl) {
  const base = serverUrl.replace(/\/+$/, "");
  const wsUrl = base.startsWith("https")
    ? base.replace("https://", "wss://")
    : base.replace("http://", "ws://");
  const url = `${wsUrl}/api/bridge/ws`;

  let ws = null;
  let reconnectTimer = null;
  let lastToken = null;
  const RECONNECT_DELAY = 5000;

  async function connect(token) {
    if (!token) return false;
    lastToken = token;

    const withToken = `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
    ws = new WebSocket(withToken);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "agent" && msg.requestId) {
          handleAgentMessage(msg);
        }
      } catch {
        // ignore
      }
    });

    ws.on("close", () => {
      ws = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => connect(lastToken), RECONNECT_DELAY);
    });

    ws.on("error", () => {
      // Reconnect on next close
    });

    return new Promise((resolve) => {
      ws.once("open", () => resolve(true));
      ws.once("close", () => resolve(false));
    });
  }

  async function handleAgentMessage(msg) {
    const { message, requestId } = msg;
    try {
      const res = await fetch("http://127.0.0.1:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = await res.json();
      const reply = data.reply || data.message || "";
      sendResponse(requestId, reply);
    } catch (err) {
      sendResponse(requestId, `错误: ${err.message}`);
    }
  }

  function sendResponse(requestId, reply) {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: "agent-response", requestId, reply }));
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  function isConnected() {
    return ws && ws.readyState === 1;
  }

  return { connect, disconnect, isConnected };
}

module.exports = { createBridge };
