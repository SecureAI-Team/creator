#!/usr/bin/env bash
# =============================================================================
# 启动 VNC + noVNC 服务（用于远程手动登录浏览器）
# =============================================================================
set -euo pipefail

# 加载环境变量
if [ -f ~/.env.creator ]; then
  source ~/.env.creator
fi

VNC_DISPLAY=":1"
VNC_PORT=5901
NOVNC_PORT=6080
RESOLUTION="1280x800"

# ------ VNC 密码检查 ------
if [ -z "${VNC_PASSWORD:-}" ]; then
  echo "⚠️  警告: 未设置 VNC_PASSWORD 环境变量"
  echo "请在 ~/.env.creator 中设置 VNC_PASSWORD（至少 6 位）"
  echo ""
  read -sp "请立即输入 VNC 密码（至少 6 位）: " VNC_PASSWORD
  echo ""
  if [ ${#VNC_PASSWORD} -lt 6 ]; then
    echo "错误: VNC 密码至少 6 位字符"
    exit 1
  fi
fi

# 设置 VNC 密码（非交互模式）
mkdir -p ~/.vnc
echo "$VNC_PASSWORD" | vncpasswd -f > ~/.vnc/passwd
chmod 600 ~/.vnc/passwd
echo "VNC 密码已设置"

echo "启动 VNC 服务..."

# 停止已有的 VNC
vncserver -kill "$VNC_DISPLAY" 2>/dev/null || true

# 启动 VNC（使用密码认证）
vncserver "$VNC_DISPLAY" -geometry "$RESOLUTION" -depth 24 -SecurityTypes VncAuth

echo "启动 noVNC Web 代理..."
# 杀掉已有的 websockify
pkill -f "websockify.*$NOVNC_PORT" 2>/dev/null || true

# 启动 noVNC
websockify --web=/usr/share/novnc "$NOVNC_PORT" "localhost:$VNC_PORT" &

echo ""
echo "=== VNC 已启动（已设置密码保护）==="
echo "  Web 访问: http://<你的ECS公网IP>:$NOVNC_PORT/vnc.html"
echo "  VNC 客户端: <你的ECS公网IP>:$VNC_PORT"
echo ""
echo "⚠️  安全提示:"
echo "  1. 确保 ECS 安全组仅允许你的 IP 访问端口 $NOVNC_PORT"
echo "  2. 不要将 VNC 端口对公网开放"
echo "  3. 详见 docs/ecs-security-groups.md"
