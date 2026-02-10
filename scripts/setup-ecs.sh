#!/usr/bin/env bash
# =============================================================================
# ECS Docker 环境一键部署脚本
# 在阿里云 ECS (Ubuntu 24.04) 上运行，自动安装 Docker 并启动全部容器化服务
# =============================================================================
set -euo pipefail

echo "=== 自媒体创作助手 SaaS - Docker 部署 ==="
echo ""

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$PROJECT_DIR"

# ------ 1. Install Docker ------
echo "[1/5] 安装 Docker..."
if ! command -v docker &> /dev/null; then
  # Use Aliyun Docker mirror for faster installation in China
  curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo systemctl enable docker
  sudo systemctl start docker
  # Add current user to docker group
  sudo usermod -aG docker "$USER"
  echo "Docker 已安装。请重新登录以使 docker 组生效，或运行: newgrp docker"
else
  echo "Docker 已安装: $(docker --version)"
fi

# ------ 2. Docker log config ------
echo "[2/5] 配置 Docker 日志..."
if [ ! -f /etc/docker/daemon.json ]; then
  sudo mkdir -p /etc/docker
  sudo cp "$PROJECT_DIR/docker/mirrors/daemon.json" /etc/docker/daemon.json
  sudo systemctl daemon-reload
  sudo systemctl restart docker
  echo "Docker 日志配置完成"
else
  echo "Docker 配置已存在"
fi
echo ""
echo "  提示: 本项目 Dockerfile 和 docker-compose.yml 已使用 DaoCloud 镜像加速"
echo "  (m.daocloud.io)，无需配置 Docker Hub mirror。"

# ------ 3. Create .env file ------
echo "[3/5] 检查环境变量配置..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
  cat > "$PROJECT_DIR/.env" << 'ENVEOF'
# =============================================================================
# 自媒体创作助手 Docker 环境变量
# 请修改以下配置项后再运行 docker compose up
# =============================================================================

# ---- 数据库 ----
POSTGRES_DB=creator_saas
POSTGRES_USER=creator
POSTGRES_PASSWORD=change-me-to-a-secure-password

# ---- Web 应用 ----
NEXTAUTH_URL=http://your-domain-or-ip
NEXTAUTH_SECRET=change-this-to-random-32-chars

# ---- AI 模型 (必填) ----
DASHSCOPE_API_KEY=sk-your-dashscope-api-key

# ---- Telegram Bot (推荐) ----
TELEGRAM_BOT_TOKEN=
TELEGRAM_USER_ID=

# ---- VNC 密码 ----
VNC_PASSWORD=creator123
ENVEOF
  echo ""
  echo "  已创建 .env 文件。请编辑后继续："
  echo "    vim $PROJECT_DIR/.env"
  echo ""
  echo "  必填项："
  echo "    - POSTGRES_PASSWORD (数据库密码)"
  echo "    - NEXTAUTH_URL (你的域名或 IP)"
  echo "    - NEXTAUTH_SECRET (openssl rand -base64 32)"
  echo "    - DASHSCOPE_API_KEY (通义千问 API Key)"
  echo ""
  echo "  编辑完成后运行："
  echo "    docker compose up -d --build"
  echo ""
  exit 0
else
  echo ".env 文件已存在"
fi

# ------ 4. Build and start ------
echo "[4/5] 构建并启动所有服务..."
docker compose up -d --build

# ------ 5. Wait for services and show status ------
echo "[5/5] 等待服务就绪..."
echo ""

# db-init service handles prisma db push + seed automatically
# Wait for it to complete
echo "正在初始化数据库和创建默认账户 (db-init 服务)..."
docker compose logs -f db-init 2>/dev/null || true

echo ""
echo "=== 部署完成 ==="
echo ""
echo "服务状态："
docker compose ps
echo ""
echo "──────────────────────────────────────"
echo "默认登录账户："
echo "  管理员: admin@creator.local / admin123456"
echo "  演示:   demo@creator.local  / demo123456"
echo "──────────────────────────────────────"
echo ""
echo "访问方式："
echo "  Web 应用: http://$(hostname -I | awk '{print $1}')"
echo "  noVNC:   http://$(hostname -I | awk '{print $1}')/vnc/"
echo "  健康检查: curl http://localhost/api/health"
echo ""
echo "常用命令："
echo "  docker compose logs -f          # 查看所有日志"
echo "  docker compose logs -f web      # 查看 Web 应用日志"
echo "  docker compose restart web      # 重启 Web 应用"
echo "  docker compose down             # 停止所有服务"
echo "  docker compose up -d --build    # 重新构建并启动"
