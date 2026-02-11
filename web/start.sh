#!/bin/sh
# Start bridge server and Next.js (for Docker)
set -e
node bridge-server.js &
exec node server.js
