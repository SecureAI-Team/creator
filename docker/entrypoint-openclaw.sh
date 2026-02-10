#!/usr/bin/env bash
# =============================================================================
# OpenClaw container entrypoint
# Starts VNC server + OpenClaw Gateway via supervisord
# =============================================================================
set -e

# ---- Configure VNC password ----
VNC_PASSWORD="${VNC_PASSWORD:-creator123}"
mkdir -p /home/creator/.vnc
echo "$VNC_PASSWORD" | vncpasswd -f > /home/creator/.vnc/passwd
chmod 600 /home/creator/.vnc/passwd
chown -R creator:creator /home/creator/.vnc

# ---- VNC xstartup ----
cat > /home/creator/.vnc/xstartup << 'EOF'
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec startxfce4
EOF
chmod +x /home/creator/.vnc/xstartup
chown creator:creator /home/creator/.vnc/xstartup

# ---- Source environment if available ----
if [ -f /home/creator/app/.env ]; then
  set -a
  # shellcheck source=/dev/null
  . /home/creator/app/.env
  set +a
fi

# ---- Start supervisord (manages VNC + OpenClaw) ----
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
