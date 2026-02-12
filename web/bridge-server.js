#!/usr/bin/env node
/**
 * Bridge Server - WebSocket relay for local OpenClaw (desktop client).
 *
 * Desktop clients connect here with a JWT. Agent requests are forwarded
 * through this connection to the user's local OpenClaw.
 *
 * Runs on port 3002 (configurable via BRIDGE_PORT).
 * Nginx proxies /api/bridge/ws to this server.
 *
 * NOTE: jose is an ESM-only package. We use dynamic import() to load it
 * from this CommonJS entry point for maximum compatibility.
 */

const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = parseInt(process.env.BRIDGE_PORT || "3002", 10);
const TAG = "[Bridge]";

function log(...args) {
  console.log(TAG, new Date().toISOString(), ...args);
}
function warn(...args) {
  console.warn(TAG, new Date().toISOString(), ...args);
}
function error(...args) {
  console.error(TAG, new Date().toISOString(), ...args);
}

// ---- Bootstrap (async to handle ESM import of jose) ----
(async () => {
  // Dynamic import for ESM-only jose package
  let jwtVerify;
  try {
    const jose = await import("jose");
    jwtVerify = jose.jwtVerify;
    log("jose loaded successfully");
  } catch (err) {
    error("FATAL: Failed to load jose library:", err.message);
    error("Bridge server cannot verify tokens. Exiting.");
    process.exit(1);
  }

  const SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || "change-this-secret"
  );

  // userId -> WebSocket (only one connection per user, newest wins)
  const connections = new Map();

  // requestId -> { resolve, reject, ack, acked, ackStage, ackTimeout }
  const pending = new Map();

  async function verifyToken(token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      return payload;
    } catch {
      return null;
    }
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);

    // Health check
    if (url.pathname === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        connections: connections.size,
        pending: pending.size,
      }));
      return;
    }

    // Internal API: check if user has bridge (for Next.js)
    if (url.pathname === "/internal/status" && req.method === "GET") {
      const userId = url.searchParams.get("userId");
      const connected = userId ? connections.has(userId) : false;
      log(`status check: userId=${userId}, connected=${connected}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ connected }));
      return;
    }

    // Internal API: send message via bridge (called by Next.js agent route)
    if (url.pathname === "/internal/send" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        // Only allow from localhost
        const remote = req.socket.remoteAddress;
        if (remote !== "127.0.0.1" && remote !== "::1" && remote !== "::ffff:127.0.0.1") {
          warn(`send rejected from ${remote} (not localhost)`);
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "forbidden" }));
          return;
        }

        let data;
        try {
          data = JSON.parse(body);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid json" }));
          return;
        }

        const { userId, message, returnOnAck, ackTimeoutMs } = data;
        if (!userId || typeof message !== "string") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "missing userId or message" }));
          return;
        }

        const ws = connections.get(userId);
        if (!ws || ws.readyState !== 1) {
          log(`send: no active bridge for userId=${userId} (ws=${ws ? "exists,state=" + ws.readyState : "null"})`);
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "no_bridge" }));
          return;
        }

        const requestId = crypto.randomUUID();
        log(`send: userId=${userId}, requestId=${requestId}, message=${message.slice(0, 80)}`);
        let responded = false;
        const waitAckOnly = !!returnOnAck;
        const ackTimeout = Number.isFinite(ackTimeoutMs) ? Math.max(1000, Math.min(20000, Number(ackTimeoutMs))) : 5000;
        const finish = (status, body) => {
          if (responded) return;
          responded = true;
          clearTimeout(timeout);
          const p = pending.get(requestId);
          if (p?.ackTimeout) clearTimeout(p.ackTimeout);
          pending.delete(requestId);
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(body));
        };

        const timeout = setTimeout(() => {
          if (pending.has(requestId)) {
            warn(`requestId=${requestId} timed out (65s)`);
            finish(504, { error: "timeout" });
          }
        }, 65_000);

        const entry = {
          ack: (stage = "received") => {
            log(`ack: requestId=${requestId}, stage=${stage}`);
            if (waitAckOnly) {
              finish(200, { ack: true, stage });
              return;
            }
            const p = pending.get(requestId);
            if (p) {
              p.acked = true;
              p.ackStage = stage;
            }
          },
          resolve: (reply) => {
            const p = pending.get(requestId);
            log(`resolve: requestId=${requestId}, replyLen=${(reply || "").length}`);
            finish(200, {
              reply: reply ?? "",
              ack: !!p?.acked,
              stage: p?.ackStage || null,
            });
          },
          reject: (err) => {
            warn(`reject: requestId=${requestId}, error=${err}`);
            finish(502, { error: err || "bridge_error" });
          },
          acked: false,
          ackStage: null,
          ackTimeout: null,
        };
        if (waitAckOnly) {
          entry.ackTimeout = setTimeout(() => {
            if (pending.has(requestId)) {
              warn(`ack timeout: requestId=${requestId} (${ackTimeout}ms)`);
              finish(504, { error: "ack_timeout" });
            }
          }, ackTimeout);
        }
        pending.set(requestId, entry);

        const payload = JSON.stringify({ type: "agent", message, requestId });
        ws.send(payload, (err) => {
          if (err) {
            error(`ws.send error: requestId=${requestId}, error=${err.message}`);
            const p = pending.get(requestId);
            if (p) p.reject(err.message);
          }
        });
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);
    const token = url.searchParams.get("token") || url.searchParams.get("t");

    log(`WS connection attempt from ${req.socket.remoteAddress}`);

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      warn("WS connection rejected: invalid token");
      ws.close(4001, "invalid_token");
      return;
    }

    const userId = payload.userId;
    log(`WS authenticated: userId=${userId}`);

    // Replace existing connection
    const old = connections.get(userId);
    if (old) {
      log(`Replacing existing connection for userId=${userId}`);
      old.close();
    }
    connections.set(userId, ws);
    log(`Active connections: ${connections.size}`);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "agent-ack" && msg.requestId) {
          const p = pending.get(msg.requestId);
          if (p) {
            p.ack(msg.stage || "received");
          }
        }
        if (msg.type === "agent-response" && msg.requestId) {
          const p = pending.get(msg.requestId);
          if (p) {
            p.resolve(msg.reply ?? "");
          }
        }
      } catch {
        // ignore
      }
    });

    ws.on("close", (code, reason) => {
      log(`WS closed: userId=${userId}, code=${code}, reason=${reason || "none"}`);
      if (connections.get(userId) === ws) {
        connections.delete(userId);
      }
      log(`Active connections: ${connections.size}`);
    });

    ws.on("error", (err) => {
      error(`WS error: userId=${userId}, error=${err.message}`);
      if (connections.get(userId) === ws) {
        connections.delete(userId);
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    log(`listening on port ${PORT}`);
    log(`Node.js ${process.version}`);
  });
})();
