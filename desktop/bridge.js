/**
 * Bridge client - WebSocket connection to server for local OpenClaw relay.
 * Forwards agent messages from server to local OpenClaw (localhost:3000).
 *
 * IMPORTANT: The "received" ACK is only sent AFTER confirming OpenClaw is
 * reachable. If OpenClaw is down, NO ACK is sent, causing the server to
 * time out and fall back to VNC automatically.
 */

const WebSocket = require("ws");
const net = require("net");

/**
 * @param {string} serverUrl - Base URL (e.g. https://example.com)
 * @param {{ localOpenClawPort?: number|Function, onTaskEvent?: (evt: any) => void, logger?: any }} options
 */
function createBridge(serverUrl, options = {}) {
  const base = serverUrl.replace(/\/+$/, "");
  const wsUrl = base.startsWith("https")
    ? base.replace("https://", "wss://")
    : base.replace("http://", "ws://");
  const url = `${wsUrl}/api/bridge/ws`;
  const bLog = options.logger || { info() {}, warn() {}, error() {}, debug() {} };
  const getPort = () =>
    typeof options.localOpenClawPort === "function"
      ? options.localOpenClawPort() || 3000
      : options.localOpenClawPort || 3000;
  const getGatewayToken = () =>
    typeof options.localGatewayToken === "function"
      ? options.localGatewayToken()
      : options.localGatewayToken || null;
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

  /**
   * Quick TCP probe to check if OpenClaw port is open.
   * Resolves true/false within timeoutMs.
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

  async function connect(token) {
    if (!token) return false;
    lastToken = token;

    const withToken = `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
    bLog.info("Connecting to bridge:", url);
    ws = new WebSocket(withToken);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        bLog.debug("WS message:", msg.type, msg.requestId || "");
        if (msg.type === "agent" && msg.requestId) {
          handleAgentMessage(msg);
        }
      } catch (err) {
        bLog.warn("WS message parse error:", err?.message);
      }
    });

    ws.on("close", (code, reason) => {
      bLog.warn(`WS closed: code=${code}, reason=${reason || "none"}`);
      ws = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => connect(lastToken), RECONNECT_DELAY);
    });

    ws.on("error", (err) => {
      bLog.error("WS error:", err?.message || err);
    });

    return new Promise((resolve) => {
      ws.once("open", () => {
        bLog.info("WS connected");
        resolve(true);
      });
      ws.once("close", () => resolve(false));
    });
  }

  async function handleAgentMessage(msg) {
    const { message, requestId } = msg;
    bLog.info(`[${requestId}] Agent message: ${message}`);

    const port = getPort();

    // ---- Pre-check: is OpenClaw reachable? ----
    // Retry up to 5 times (total ~12s) to handle case where OpenClaw is still starting.
    // If not reachable after retries, DON'T send ACK → server times out → falls back to VNC.
    let portOpen = false;
    const MAX_PROBE_RETRIES = 5;
    const PROBE_INTERVAL_MS = 2000;
    for (let attempt = 1; attempt <= MAX_PROBE_RETRIES; attempt++) {
      portOpen = await probePort(port, 1500);
      if (portOpen) {
        if (attempt > 1) bLog.info(`[${requestId}] OpenClaw became reachable after ${attempt} probe(s)`);
        break;
      }
      if (attempt < MAX_PROBE_RETRIES) {
        bLog.debug(`[${requestId}] OpenClaw probe ${attempt}/${MAX_PROBE_RETRIES} failed, retrying in ${PROBE_INTERVAL_MS}ms...`);
        await new Promise((r) => setTimeout(r, PROBE_INTERVAL_MS));
      }
    }
    if (!portOpen) {
      bLog.warn(`[${requestId}] OpenClaw not reachable at :${port} after ${MAX_PROBE_RETRIES} retries, NOT sending ACK (will trigger VNC fallback)`);
      emit({ type: "ack", requestId, stage: "local_unavailable", message });
      // Send error response so bridge-server can clean up the pending request
      sendResponse(requestId, `错误: 本地引擎未运行 (port ${port} unreachable)`);
      return;
    }

    // OpenClaw is reachable → send ACK
    sendAck(requestId, "received");
    emit({ type: "ack", requestId, stage: "received", message });

    try {
      const isLogin = typeof message === "string" && message.startsWith("/login ");
      if (isLogin) {
        bLog.info(`[${requestId}] Login command detected, forwarding to OpenClaw at :${port}`);
      }

      // Build headers with optional gateway token authentication
      const headers = { "Content-Type": "application/json" };
      const token = getGatewayToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      bLog.debug(`[${requestId}] POST http://127.0.0.1:${port}/api/chat`);
      const res = await fetch(`http://127.0.0.1:${port}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = await res.json();
      const reply = data.reply || data.message || "";
      bLog.info(`[${requestId}] OpenClaw reply (${res.status}): ${reply.slice(0, 200)}`);

      if (isLogin) {
        sendAck(requestId, "browser_opened");
        emit({ type: "ack", requestId, stage: "browser_opened", message });
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
      bLog.error(`[${requestId}] Error: ${err.message}`);
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
