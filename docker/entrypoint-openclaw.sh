#!/usr/bin/env bash
# =============================================================================
# OpenClaw container entrypoint
# Starts Xvfb + x11vnc + fluxbox + OpenClaw Gateway via supervisord
# =============================================================================
set -e

# ---- Store VNC password for x11vnc ----
VNC_PASSWORD="${VNC_PASSWORD:-creator123}"
echo "$VNC_PASSWORD" > /home/creator/.vnc/passwd_plain
chmod 600 /home/creator/.vnc/passwd_plain
chown -R creator:creator /home/creator/.vnc

# ---- Source environment if available ----
if [ -f /home/creator/app/.env ]; then
  set -a
  # shellcheck source=/dev/null
  . /home/creator/app/.env
  set +a
fi

# ---- Export VNC_PASSWORD for supervisord ----
export VNC_PASSWORD

# ---- Start supervisord (manages Xvfb + x11vnc + fluxbox + OpenClaw) ----
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
