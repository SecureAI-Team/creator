#!/usr/bin/env bash
# =============================================================================
# ECS 服务器初始化脚本
# 在全新的阿里云 ECS (Ubuntu 22.04+) 上运行
# =============================================================================
set -euo pipefail

echo "=== 自媒体创作助手 - ECS 环境部署 ==="

# ------ 1. 系统依赖 ------
echo "[1/6] 安装系统依赖..."
sudo apt-get update
sudo apt-get install -y \
  curl wget git unzip \
  ca-certificates fonts-liberation \
  libasound2 libatk-bridge2.0-0 libatk1.0-0 \
  libcups2 libdbus-1-3 libdrm2 libgbm1 \
  libgtk-3-0 libnspr4 libnss3 libx11-xcb1 \
  libxcomposite1 libxdamage1 libxrandr2 \
  xdg-utils libxss1 libxtst6 \
  fonts-noto-cjk fonts-noto-color-emoji

# ------ 2. Node.js ------
echo "[2/6] 安装 Node.js 22.x..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node.js $(node -v)"

# ------ 3. OpenClaw ------
echo "[3/6] 安装 OpenClaw..."
if ! command -v openclaw &> /dev/null; then
  npm install -g openclaw
fi
echo "OpenClaw 已安装"

# ------ 4. Playwright + Chromium ------
echo "[4/6] 安装 Playwright 和 Chromium..."
npx playwright install chromium
npx playwright install-deps chromium
echo "Playwright + Chromium 已安装"

# ------ 5. VNC (可选，用于远程手动登录浏览器) ------
echo "[5/6] 安装 VNC 服务 (noVNC)..."
sudo apt-get install -y tigervnc-standalone-server novnc websockify
echo "VNC 已安装。启动方式："
echo "  vncserver :1 -geometry 1280x800 -depth 24"
echo "  websockify --web=/usr/share/novnc 6080 localhost:5901 &"
echo "  浏览器访问: http://<ECS_IP>:6080/vnc.html"

# ------ 6. 环境变量 ------
echo "[6/6] 配置环境变量..."
if [ ! -f ~/.env.creator ]; then
  cat > ~/.env.creator << 'ENVEOF'
# 阿里云 DashScope API Key（必填）
export DASHSCOPE_API_KEY="sk-your-api-key-here"

# OpenClaw 数据目录
export OPENCLAW_HOME="$HOME/.openclaw"
ENVEOF
  echo "请编辑 ~/.env.creator 填入你的 DASHSCOPE_API_KEY"
  echo "然后执行: source ~/.env.creator"
else
  echo "~/.env.creator 已存在"
fi

echo ""
echo "=== 部署完成 ==="
echo ""
echo "下一步："
echo "  1. 编辑 ~/.env.creator 填入 API Key"
echo "  2. source ~/.env.creator"
echo "  3. 将本项目复制到服务器"
echo "  4. cd creator && openclaw onboard"
echo "  5. openclaw start"
