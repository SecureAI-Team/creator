#!/usr/bin/env node
/**
 * Bridge Server - WebSocket relay for local OpenClaw (desktop client).
 *
 * Desktop clients connect here with a JWT. Agent requests are forwarded
 * through this connection to the user's local OpenClaw.
 *
 * Runs on port 3002 (configurable via BRIDGE_PORT).
 * Nginx proxies /api/bridge/ws to this server.
 */

const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const { jwtVerify } = require("jose");

const PORT = parseInt(process.env.BRIDGE_PORT || "3002", 10);
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

  // Internal API: check if user has bridge (for Next.js)
  if (url.pathname === "/internal/status" && req.method === "GET") {
    const userId = url.searchParams.get("userId");
    const connected = userId ? connections.has(userId) : false;
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
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "no_bridge" }));
        return;
      }

      const requestId = crypto.randomUUID();
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
          finish(504, { error: "timeout" });
        }
      }, 65_000);

      const entry = {
        ack: (stage = "received") => {
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
          finish(200, {
            reply: reply ?? "",
            ack: !!p?.acked,
            stage: p?.ackStage || null,
          });
        },
        reject: (err) => finish(502, { error: err || "bridge_error" }),
        acked: false,
        ackStage: null,
        ackTimeout: null,
      };
      if (waitAckOnly) {
        entry.ackTimeout = setTimeout(() => {
          if (pending.has(requestId)) {
            finish(504, { error: "ack_timeout" });
          }
        }, ackTimeout);
      }
      pending.set(requestId, entry);

      const payload = JSON.stringify({ type: "agent", message, requestId });
      ws.send(payload, (err) => {
        if (err) {
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

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    ws.close(4001, "invalid_token");
    return;
  }

  const userId = payload.userId;

  // Replace existing connection
  const old = connections.get(userId);
  if (old) old.close();
  connections.set(userId, ws);

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

  ws.on("close", () => {
    if (connections.get(userId) === ws) {
      connections.delete(userId);
    }
  });

  ws.on("error", () => {
    if (connections.get(userId) === ws) {
      connections.delete(userId);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Bridge] listening on port ${PORT}`);
});
