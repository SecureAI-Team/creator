/**
 * Bridge client - WebSocket connection to server for local OpenClaw relay.
 * Forwards agent messages from server to local OpenClaw gateway (WebSocket RPC).
 *
 * IMPORTANT: The "received" ACK is only sent AFTER confirming OpenClaw is
 * reachable. If OpenClaw is down, NO ACK is sent, causing the server to
 * time out and fall back to VNC automatically.
 */

const WebSocket = require("ws");
const net = require("net");
const crypto = require("crypto");

// ---- Minimal OpenClaw Gateway RPC client ----

/**
 * Creates a lightweight WebSocket RPC client for the local OpenClaw gateway.
 * Handles the connect handshake and provides a request() method.
 */
function createGatewayRPC(getPort, getToken, logger) {
  let ws = null;
  let connected = false;
  let pending = new Map();
  let currentPort = null;
  let currentToken = null;

  /**
   * Ensure the WebSocket is connected and handshake is complete.
   * Reconnects if port/token changed or connection is lost.
   */
  function ensureConnected(timeoutMs = 10000) {
    const port = getPort();
    const token = getToken();

    // Reuse existing connection if still valid
    if (connected && ws && ws.readyState === WebSocket.OPEN &&
        currentPort === port && currentToken === token) {
      return Promise.resolve(true);
    }

    // Disconnect existing
    if (ws) {
      try { ws.close(); } catch {}
      ws = null;
      connected = false;
    }

    return new Promise((resolve) => {
      currentPort = port;
      currentToken = token;

      const deadline = setTimeout(() => {
        logger.warn(`Gateway RPC connect timeout (${timeoutMs}ms)`);
        resolve(false);
      }, timeoutMs);

      try {
        ws = new WebSocket(`ws://127.0.0.1:${port}`);
      } catch (err) {
        clearTimeout(deadline);
        logger.error("Gateway RPC WebSocket creation failed:", err.message);
        resolve(false);
        return;
      }

      // After WS opens, wait for optional connect.challenge, then send connect
      let connectSent = false;
      let challengeTimer = null;

      function sendConnectFrame() {
        if (connectSent || !ws || ws.readyState !== WebSocket.OPEN) return;
        connectSent = true;
        if (challengeTimer) { clearTimeout(challengeTimer); challengeTimer = null; }

        const id = crypto.randomUUID();
        const frame = {
          type: "req",
          id,
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "gateway-client",
              displayName: "creator-desktop-bridge",
              version: "1.0.0",
              platform: process.platform,
              mode: "backend",
            },
            caps: [],
            auth: token ? { token } : undefined,
            role: "operator",
            scopes: ["operator.admin"],
          },
        };

        pending.set(id, {
          resolve: () => {
            connected = true;
            clearTimeout(deadline);
            logger.info("Gateway RPC connected (port " + port + ")");
            resolve(true);
          },
          reject: (err) => {
            clearTimeout(deadline);
            logger.error("Gateway RPC connect rejected:", err.message);
            resolve(false);
          },
          timer: null, // Deadline timer handles overall timeout
          expectFinal: false,
        });

        ws.send(JSON.stringify(frame));
      }

      ws.on("open", () => {
        logger.debug("Gateway RPC WS opened, waiting for challenge...");
        // Wait up to 800ms for a connect.challenge event, then send connect anyway
        challengeTimer = setTimeout(sendConnectFrame, 800);
      });

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());

          // Handle connect.challenge event
          if (msg.event === "connect.challenge") {
            logger.debug("Gateway RPC received connect.challenge");
            sendConnectFrame();
            return;
          }

          // Ignore other events (tick, chat.message, etc.)
          if (msg.event) return;

          // Handle RPC responses
          if (msg.id && pending.has(msg.id)) {
            const p = pending.get(msg.id);
            const status = msg.payload?.status;
            // If expectFinal, skip "accepted"/"started" and wait for final
            if (p.expectFinal && (status === "accepted" || status === "started")) return;
            pending.delete(msg.id);
            if (p.timer) clearTimeout(p.timer);
            if (msg.ok) p.resolve(msg.payload);
            else p.reject(new Error(msg.error?.message || "unknown gateway error"));
          }
        } catch (err) {
          logger.warn("Gateway RPC parse error:", err.message);
        }
      });

      ws.on("error", (err) => {
        logger.error("Gateway RPC WS error:", err.message);
      });

      ws.on("close", (code) => {
        const wasConnected = connected;
        connected = false;
        ws = null;
        if (wasConnected) {
          logger.warn(`Gateway RPC WS closed (code=${code})`);
        }
        // Reject all pending requests
        for (const [id, p] of pending) {
          if (p.timer) clearTimeout(p.timer);
          p.reject(new Error("gateway connection closed"));
        }
        pending.clear();
        // Also resolve the connect promise if still pending
        clearTimeout(deadline);
        if (!connectSent) resolve(false);
      });
    });
  }

  /**
   * Send an RPC request to the gateway.
   * @param {string} method - RPC method (e.g. "chat.send")
   * @param {object} params - Method parameters
   * @param {object} opts - Options: { timeoutMs, expectFinal }
   */
  async function request(method, params, { timeoutMs = 60000, expectFinal = false } = {}) {
    const ok = await ensureConnected();
    if (!ok) throw new Error("gateway not reachable");
    if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error("gateway not connected");

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timeout (${timeoutMs}ms)`));
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer, expectFinal });
      ws.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }

  function disconnect() {
    if (ws) {
      try { ws.close(); } catch {}
      ws = null;
    }
    connected = false;
    for (const [, p] of pending) {
      if (p.timer) clearTimeout(p.timer);
    }
    pending.clear();
  }

  function isConnected() {
    return connected && ws && ws.readyState === WebSocket.OPEN;
  }

  return { ensureConnected, request, disconnect, isConnected };
}


// ---- Bridge client ----

/**
 * @param {string} serverUrl - Base URL (e.g. https://example.com)
 * @param {{ localOpenClawPort?: number|Function, localGatewayToken?: string|Function, onTaskEvent?: (evt: any) => void, logger?: any }} options
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
  let tokenInvalid = false; // Set true when server rejects token (code 4001)
  const RECONNECT_DELAY = 5000;

  // Create the local gateway RPC client
  const gatewayRPC = createGatewayRPC(getPort, getGatewayToken, bLog);

  function cleanupWs() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      try { ws.removeAllListeners(); ws.close(); } catch {}
      ws = null;
    }
  }

  async function connect(token) {
    if (!token) return false;

    // Clean up any existing connection before creating a new one
    cleanupWs();

    lastToken = token;
    tokenInvalid = false;

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

      // If server rejected token (4001), DON'T auto-reconnect with same token.
      // Let the bridge-connector component fetch a fresh token and call connect() again.
      if (code === 4001) {
        tokenInvalid = true;
        bLog.warn("Token rejected by server. Waiting for fresh token from bridge-connector.");
        return;
      }

      // For other close codes, auto-reconnect with same token
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

  // Platform login URL mapping
  const PLATFORM_LOGIN_URLS = {
    bilibili: "https://passport.bilibili.com/login",
    douyin: "https://creator.douyin.com",
    xiaohongshu: "https://creator.xiaohongshu.com",
    youtube: "https://studio.youtube.com",
    "weixin-mp": "https://mp.weixin.qq.com",
    "weixin-channels": "https://channels.weixin.qq.com",
    kuaishou: "https://cp.kuaishou.com",
    zhihu: "https://www.zhihu.com/signin",
    weibo: "https://weibo.com/login",
    toutiao: "https://mp.toutiao.com",
  };

  // Platform cookie identifiers used to detect login status
  const PLATFORM_COOKIE_MARKERS = {
    bilibili: { domain: ".bilibili.com", names: ["SESSDATA", "bili_jct"] },
    douyin: { domain: ".douyin.com", names: ["sessionid", "passport_csrf_token"] },
    xiaohongshu: { domain: ".xiaohongshu.com", names: ["web_session", "a1"] },
    youtube: { domain: ".youtube.com", names: ["SID", "SSID"] },
    "weixin-mp": { domain: ".qq.com", names: ["slave_sid", "slave_user"] },
    "weixin-channels": { domain: ".qq.com", names: ["slave_sid", "slave_user"] },
    kuaishou: { domain: ".kuaishou.com", names: ["passToken", "kuaishou.server.web_st"] },
    zhihu: { domain: ".zhihu.com", names: ["z_c0"] },
    weibo: { domain: ".weibo.com", names: ["SUB", "SUBP"] },
    toutiao: { domain: ".toutiao.com", names: ["sso_uid_tt", "sessionid"] },
  };

  async function handleAgentMessage(msg) {
    const { message, requestId } = msg;
    bLog.info(`[${requestId}] Agent message: ${message}`);

    const isLogin = typeof message === "string" && message.startsWith("/login ");
    const isStatus = typeof message === "string" && message.startsWith("/status ");
    const isPublish = typeof message === "string" && message.startsWith("/publish ");
    const isData = typeof message === "string" && message.startsWith("/data ");

    // ---- For /publish commands: invoke platform publish script ----
    if (isPublish) {
      const payloadStr = message.substring(9); // strip "/publish "
      bLog.info(`[${requestId}] Publish command received`);
      sendAck(requestId, "received");
      emit({ type: "ack", requestId, stage: "received", message: "/publish ..." });

      try {
        const payload = JSON.parse(payloadStr);
        bLog.info(`[${requestId}] Publishing to ${payload.platform}: "${payload.title}"`);

        if (typeof options.onPublish === "function") {
          const result = await options.onPublish(payload.platform, payload);
          bLog.info(`[${requestId}] Publish result: ${JSON.stringify(result)}`);
          sendAck(requestId, "local_response");
          emit({ type: "response", requestId, ok: true, message: "/publish ...", reply: JSON.stringify(result) });
          sendResponse(requestId, JSON.stringify(result));
        } else {
          throw new Error("No onPublish handler available");
        }
      } catch (err) {
        bLog.error(`[${requestId}] Publish error: ${err.message}`);
        const errorResult = JSON.stringify({ success: false, error: err.message });
        sendAck(requestId, "local_error");
        emit({ type: "response", requestId, ok: false, message: "/publish ...", error: err.message });
        sendResponse(requestId, errorResult);
      }
      return;
    }

    // ---- For /data commands: invoke data collection script ----
    if (isData) {
      const parts = message.split(" ");
      const action = parts[1]; // "refresh"
      const targetPlatform = parts[2] || "all"; // platform or "all"
      bLog.info(`[${requestId}] Data command: action=${action}, platform=${targetPlatform}`);
      sendAck(requestId, "received");
      emit({ type: "ack", requestId, stage: "received", message });

      try {
        if (typeof options.onDataRefresh === "function") {
          const result = await options.onDataRefresh(targetPlatform);
          bLog.info(`[${requestId}] Data refresh result: ${JSON.stringify(result)}`);
          sendAck(requestId, "local_response");
          emit({ type: "response", requestId, ok: true, message, reply: JSON.stringify(result) });
          sendResponse(requestId, JSON.stringify(result));
        } else {
          throw new Error("No onDataRefresh handler available");
        }
      } catch (err) {
        bLog.error(`[${requestId}] Data refresh error: ${err.message}`);
        sendAck(requestId, "local_error");
        emit({ type: "response", requestId, ok: false, message, error: err.message });
        sendResponse(requestId, JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // ---- For /status commands: check cookies directly, bypass AI ----
    if (isStatus) {
      const platform = message.replace("/status ", "").trim().toLowerCase();
      const markers = PLATFORM_COOKIE_MARKERS[platform];
      bLog.info(`[${requestId}] Status check for ${platform} (cookie-based)`);
      sendAck(requestId, "received");
      emit({ type: "ack", requestId, stage: "received", message });

      if (markers && typeof options.onCheckCookies === "function") {
        try {
          const cookies = await options.onCheckCookies();
          // Check if any marker cookie exists for this platform
          const found = cookies.filter(
            (c) => c.domain && c.domain.includes(markers.domain) && markers.names.includes(c.name)
          );
          const loggedIn = found.length > 0;
          const reply = loggedIn
            ? `已登录 ${platform} (found ${found.map((c) => c.name).join(", ")})`
            : `未登录 ${platform} (no session cookies for ${markers.domain})`;
          bLog.info(`[${requestId}] ${reply}`);

          sendAck(requestId, "local_response");
          emit({ type: "ack", requestId, stage: "local_response", message });
          emit({ type: "response", requestId, ok: true, message, reply });
          sendResponse(requestId, reply);
        } catch (err) {
          bLog.error(`[${requestId}] Cookie check failed: ${err.message}`);
          const reply = `未登录 ${platform} (cookie check error)`;
          sendAck(requestId, "local_response");
          emit({ type: "response", requestId, ok: true, message, reply });
          sendResponse(requestId, reply);
        }
      } else {
        const reply = `未登录 ${platform} (no cookie checker available)`;
        sendAck(requestId, "local_response");
        emit({ type: "response", requestId, ok: true, message, reply });
        sendResponse(requestId, reply);
      }
      return;
    }

    // ---- For /login commands: directly open the browser, bypass AI ----
    if (isLogin) {
      const platform = message.replace("/login ", "").trim().toLowerCase();
      const loginUrl = PLATFORM_LOGIN_URLS[platform];

      if (loginUrl) {
        bLog.info(`[${requestId}] Login command: opening ${loginUrl} directly (bypassing AI)`);
        sendAck(requestId, "received");
        emit({ type: "ack", requestId, stage: "received", message });

        try {
          // Use the onOpenUrl callback to open the browser directly
          if (typeof options.onOpenUrl === "function") {
            await options.onOpenUrl(loginUrl);
            bLog.info(`[${requestId}] Browser opened for ${platform}: ${loginUrl}`);
          } else {
            bLog.warn(`[${requestId}] No onOpenUrl callback, cannot open browser`);
          }

          sendAck(requestId, "browser_opened");
          emit({ type: "ack", requestId, stage: "browser_opened", message });
          sendAck(requestId, "login_page_loaded");
          emit({ type: "ack", requestId, stage: "login_page_loaded", message });

          const reply = `已在浏览器中打开 ${platform} 登录页面: ${loginUrl}`;
          emit({ type: "response", requestId, ok: true, message, reply });
          sendResponse(requestId, reply);
        } catch (err) {
          bLog.error(`[${requestId}] Failed to open browser: ${err.message}`);
          sendAck(requestId, "local_error");
          emit({ type: "response", requestId, ok: false, message, error: err.message });
          sendResponse(requestId, `错误: 无法打开浏览器 - ${err.message}`);
        }
        return;
      }
      // Unknown platform: fall through to AI
      bLog.warn(`[${requestId}] Unknown platform "${platform}", falling through to AI`);
    }

    // ---- For non-login commands: use OpenClaw AI gateway ----
    let rpcReady = false;
    const MAX_CONNECT_RETRIES = 3;
    const CONNECT_RETRY_INTERVAL_MS = 3000;
    for (let attempt = 1; attempt <= MAX_CONNECT_RETRIES; attempt++) {
      rpcReady = await gatewayRPC.ensureConnected(8000);
      if (rpcReady) {
        if (attempt > 1) bLog.info(`[${requestId}] Gateway RPC connected after ${attempt} attempt(s)`);
        break;
      }
      if (attempt < MAX_CONNECT_RETRIES) {
        bLog.debug(`[${requestId}] Gateway RPC connect attempt ${attempt}/${MAX_CONNECT_RETRIES} failed, retrying in ${CONNECT_RETRY_INTERVAL_MS}ms...`);
        await new Promise((r) => setTimeout(r, CONNECT_RETRY_INTERVAL_MS));
      }
    }

    if (!rpcReady) {
      const port = getPort();
      bLog.warn(`[${requestId}] OpenClaw gateway not reachable at :${port} after ${MAX_CONNECT_RETRIES} retries, NOT sending ACK (will trigger VNC fallback)`);
      emit({ type: "ack", requestId, stage: "local_unavailable", message });
      sendResponse(requestId, `错误: 本地引擎未运行 (gateway RPC unreachable)`);
      return;
    }

    // OpenClaw is reachable → send ACK
    sendAck(requestId, "received");
    emit({ type: "ack", requestId, stage: "received", message });

    try {
      // Send chat message via WebSocket RPC
      bLog.debug(`[${requestId}] chat.send via gateway RPC`);
      const result = await gatewayRPC.request("chat.send", {
        sessionKey: "main",
        message: message,
        idempotencyKey: requestId,
      }, { timeoutMs: 120_000, expectFinal: false });

      const status = result?.status || "unknown";
      const runId = result?.runId || requestId;
      bLog.info(`[${requestId}] Gateway RPC chat.send result: status=${status}, runId=${runId}`);

      sendAck(requestId, "local_response");
      emit({ type: "ack", requestId, stage: "local_response", message });

      const reply = `OpenClaw: ${status} (runId: ${runId})`;
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
    cleanupWs();
    gatewayRPC.disconnect();
  }

  function isConnected() {
    return ws && ws.readyState === 1 && !tokenInvalid;
  }

  return { connect, disconnect, isConnected };
}

module.exports = { createBridge };
