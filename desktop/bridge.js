/**
 * Bridge client - WebSocket connection to server for local OpenClaw relay.
 * Forwards agent messages from server to local OpenClaw (localhost:3000).
 */

const WebSocket = require("ws");

/**
 * @param {string} serverUrl - Base URL (e.g. https://example.com)
 * @param {{ localOpenClawPort?: number, onTaskEvent?: (evt: any) => void }} options
 */
function createBridge(serverUrl, options = {}) {
  const base = serverUrl.replace(/\/+$/, "");
  const wsUrl = base.startsWith("https")
    ? base.replace("https://", "wss://")
    : base.replace("http://", "ws://");
  const url = `${wsUrl}/api/bridge/ws`;
  const getPort = () =>
    typeof options.localOpenClawPort === "function"
      ? options.localOpenClawPort() || 3000
      : options.localOpenClawPort || 3000;
  const emit = (evt) => {
    try {
      if (typeof options.onTaskEvent === "function") {
        options.onTaskEvent({ ...evt, ts: Date.now() });
      }
    } catch {
      // ignore task event sink errors
    }
  };

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
    sendAck(requestId, "received");
    emit({ type: "ack", requestId, stage: "received", message });
    try {
      const isLogin = typeof message === "string" && message.startsWith("/login ");
      if (isLogin) {
        sendAck(requestId, "browser_opened");
        emit({ type: "ack", requestId, stage: "browser_opened", message });
      } else {
        sendAck(requestId, "local_request_started");
        emit({ type: "ack", requestId, stage: "local_request_started", message });
      }

      const res = await fetch(`http://127.0.0.1:${getPort()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = await res.json();
      const reply = data.reply || data.message || "";
      if (isLogin) {
        sendAck(requestId, "login_page_loaded");
        emit({ type: "ack", requestId, stage: "login_page_loaded", message });
        sendAck(requestId, "done");
        emit({ type: "ack", requestId, stage: "done", message });
      } else {
        sendAck(requestId, "local_response");
        emit({ type: "ack", requestId, stage: "local_response", message });
      }
      emit({ type: "response", requestId, ok: true, message, reply });
      sendResponse(requestId, reply);
    } catch (err) {
      sendAck(requestId, "local_error");
      emit({ type: "ack", requestId, stage: "local_error", message });
      emit({ type: "response", requestId, ok: false, message, error: err.message });
      sendResponse(requestId, `错误: ${err.message}`);
    }
  }

  function sendAck(requestId, stage) {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: "agent-ack", requestId, stage }));
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
