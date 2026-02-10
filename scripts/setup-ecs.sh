#!/usr/bin/env bash
# =============================================================================
# ECS 服务器初始化脚本
# 在全新的阿里云 ECS (Ubuntu 22.04+) 上运行
# =============================================================================
set -euo pipefail

echo "=== 自媒体创作助手 SaaS - ECS 环境部署 ==="

# ------ 1. 系统依赖 ------
echo "[1/8] 安装系统依赖..."
sudo apt-get update
sudo apt-get install -y \
  curl wget git unzip nginx \
  ca-certificates fonts-liberation \
  libasound2 libatk-bridge2.0-0 libatk1.0-0 \
  libcups2 libdbus-1-3 libdrm2 libgbm1 \
  libgtk-3-0 libnspr4 libnss3 libx11-xcb1 \
  libxcomposite1 libxdamage1 libxrandr2 \
  xdg-utils libxss1 libxtst6 \
  fonts-noto-cjk fonts-noto-color-emoji

# ------ 2. PostgreSQL ------
echo "[2/8] 安装 PostgreSQL..."
if ! command -v psql &> /dev/null; then
  sudo apt-get install -y postgresql postgresql-contrib
  sudo systemctl enable postgresql
  sudo systemctl start postgresql
  # Create database and user
  sudo -u postgres psql -c "CREATE USER creator WITH PASSWORD 'creator_password';" 2>/dev/null || true
  sudo -u postgres psql -c "CREATE DATABASE creator_saas OWNER creator;" 2>/dev/null || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE creator_saas TO creator;" 2>/dev/null || true
  echo "PostgreSQL 已安装。请修改用户密码："
  echo "  sudo -u postgres psql -c \"ALTER USER creator PASSWORD 'your-secure-password';\""
fi
echo "PostgreSQL $(psql --version | head -1)"

# ------ 3. Node.js ------
echo "[3/8] 安装 Node.js 22.x..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node.js $(node -v)"

# ------ 4. OpenClaw ------
echo "[4/8] 安装 OpenClaw..."
if ! command -v openclaw &> /dev/null; then
  npm install -g openclaw
fi
echo "OpenClaw 已安装"

# ------ 5. Playwright + Chromium ------
echo "[5/8] 安装 Playwright 和 Chromium..."
npx playwright install chromium
npx playwright install-deps chromium
echo "Playwright + Chromium 已安装"

# ------ 6. VNC (可选，用于远程手动登录浏览器) ------
echo "[6/8] 安装 VNC 服务 (noVNC)..."
sudo apt-get install -y tigervnc-standalone-server novnc websockify
echo "VNC 已安装。启动方式："
echo "  vncserver :1 -geometry 1280x800 -depth 24"
echo "  websockify --web=/usr/share/novnc 6080 localhost:5901 &"
echo "  浏览器访问: http://<ECS_IP>:6080/vnc.html"

# ------ 7. 构建 Web 应用 ------
echo "[7/8] 构建 Next.js Web 应用..."
if [ -d "web" ]; then
  cd web
  npm install
  npx prisma generate
  npm run build
  cd ..
  echo "Web 应用构建完成"
else
  echo "web/ 目录不存在，跳过"
fi

# ------ 8. 环境变量 + 数据目录 ------
echo "[8/8] 配置环境变量和数据目录..."

# Create user data directory
sudo mkdir -p /data/users
sudo chown "$(whoami)":"$(whoami)" /data/users

if [ ! -f ~/.env.creator ]; then
  cat > ~/.env.creator << 'ENVEOF'
# 阿里云 DashScope API Key（必填）
export DASHSCOPE_API_KEY="sk-your-api-key-here"

# 数据库
export DATABASE_URL="postgresql://creator:creator_password@localhost:5432/creator_saas?schema=public"

# NextAuth
export NEXTAUTH_URL="http://your-domain.com"
export NEXTAUTH_SECRET="change-this-to-random-32-chars"

# OpenClaw 用户数据目录
export OPENCLAW_DATA_DIR="/data/users"
export OPENCLAW_TEMPLATE_DIR="$HOME/creator"
ENVEOF
  echo "请编辑 ~/.env.creator 填入你的配置"
  echo "然后执行: source ~/.env.creator"
else
  echo "~/.env.creator 已存在"
fi

echo ""
echo "=== 部署完成 ==="
echo ""
echo "下一步："
echo "  1. 编辑 ~/.env.creator 填入 API Key 和数据库密码"
echo "  2. source ~/.env.creator"
echo "  3. cd creator/web && npx prisma db push  # 初始化数据库表"
echo "  4. 配置 Nginx: sudo cp scripts/nginx-saas.conf /etc/nginx/sites-available/creator"
echo "  5. sudo ln -s /etc/nginx/sites-available/creator /etc/nginx/sites-enabled/"
echo "  6. sudo systemctl reload nginx"
echo "  7. npm run start  # 启动 Web 应用 (或使用 PM2)"
