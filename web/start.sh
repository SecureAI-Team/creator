#!/bin/sh
# Start bridge server and Next.js (for Docker)
set -e

# Bridge server with auto-restart (runs in background)
while true; do
  echo "[start.sh] Starting bridge-server.js..."
  node bridge-server.js || true
  echo "[start.sh] bridge-server.js exited, restarting in 2s..."
  sleep 2
done &

exec node server.js
