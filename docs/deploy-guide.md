# ECS 部署与功能验证指南

本文档描述如何将自媒体创作助手从 GitHub 部署到阿里云 ECS 服务器（Ubuntu 24.04），并完成功能验证。

---

## 前置条件

- 阿里云 ECS 实例（推荐 Ubuntu 24.04 LTS，2C4G 及以上）
- 安全组已放行必要端口（参见 [ecs-security-groups.md](./ecs-security-groups.md)）
- 已获取阿里云 DashScope API Key（[控制台](https://dashscope.console.aliyun.com/)）
- 已创建 Telegram Bot（可选但推荐，通过 @BotFather 获取 Token）

---

## Docker 部署（推荐）

### Step 1: 创建用户并登录

```bash
# SSH 到 ECS（首次用 root）
ssh root@<ECS_IP>

# 创建专用用户（推荐，避免 root 运行）
adduser creator
usermod -aG sudo creator

# 切换到新用户
su - creator
```

### Step 2: 克隆代码

```bash
git clone https://github.com/SecureAI-Team/creator.git ~/creator
cd ~/creator
```

### Step 3: 一键部署

```bash
bash scripts/setup-ecs.sh
```

首次运行会：
1. 安装 Docker + Docker Compose（使用阿里云镜像源）
2. 配置 Docker Hub 国内镜像加速
3. 生成 `.env` 配置文件模板

### Step 4: 配置环境变量

```bash
vim .env
```

**必填项：**

| 变量 | 说明 | 获取方式 |
|------|------|----------|
| `POSTGRES_PASSWORD` | 数据库密码 | 自定义强密码 |
| `NEXTAUTH_URL` | 网站域名或 IP | `http://your-domain.com` |
| `NEXTAUTH_SECRET` | 会话加密密钥 | `openssl rand -base64 32` |
| `DASHSCOPE_API_KEY` | 通义千问 API Key | [DashScope 控制台](https://dashscope.console.aliyun.com/) |

**推荐填写：**

| 变量 | 说明 | 获取方式 |
|------|------|----------|
| `TELEGRAM_BOT_TOKEN` | Telegram 机器人 Token | @BotFather |
| `TELEGRAM_USER_ID` | 你的 Telegram 用户 ID | @userinfobot |
| `VNC_PASSWORD` | VNC 远程登录密码 | 自定义（默认 `creator123`） |

### Step 5: 构建并启动

```bash
# 构建并启动所有服务（首次需要较长时间下载镜像和构建）
docker compose up -d --build

# 初始化数据库
docker compose exec web npx prisma db push --skip-generate
```

### Step 6: 验证部署

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 健康检查
curl http://localhost/api/health
```

访问 `http://<ECS_IP>` 应该看到 Landing Page。

### Docker 常用命令

```bash
# 重启某个服务
docker compose restart web

# 查看某个服务日志
docker compose logs -f openclaw

# 重新构建并启动
docker compose up -d --build

# 停止所有服务
docker compose down

# 停止并清除数据（谨慎！）
docker compose down -v

# 进入容器调试
docker compose exec web sh
docker compose exec openclaw bash
```

### SSL 证书配置

1. 申请 SSL 证书（推荐使用 Let's Encrypt）
2. 将证书文件放到 `docker/ssl/` 目录
3. 编辑 `docker/nginx.conf`，取消 SSL 相关注释
4. 重启 nginx：`docker compose restart nginx`

### 更新代码

```bash
cd ~/creator
git pull
docker compose up -d --build
```

---

## 功能验证清单

### Web 应用

| 检查项 | 操作 | 预期结果 |
|--------|------|----------|
| Landing Page | 浏览器访问 `http://your-domain.com` | 看到产品介绍页 |
| 注册 | 点击"立即开始" | 可以通过邮箱注册新账号 |
| 登录 | 使用注册的账号登录 | 跳转到引导页或控制台 |
| 控制台 | 访问 `/overview` | 看到数据概览 |
| API 健康检查 | `curl http://your-domain.com/api/health` | 返回 JSON 状态 |
| 下载页 | 访问 `/download` | 看到客户端下载选项 |

### 基础功能

| 检查项 | 操作 | 预期结果 |
|--------|------|----------|
| Gateway 启动 | `docker compose logs openclaw` | 无错误，进程正常运行 |
| 配置加载 | 查看 Gateway 日志 | tools.yaml、platforms.yaml 正确解析 |
| Skill 加载 | 日志中搜索 `skill` | 60 个 Skill 全部加载 |

### Telegram 交互（如已配置）

| 检查项 | 操作 | 预期结果 |
|--------|------|----------|
| Bot 响应 | 发送 `/help` 给 Bot | 返回帮助信息 |
| Skill 调用 | 发送 `/tools list` | 列出所有已注册工具 |
| Skill 调用 | 发送 `/status` | 显示各平台登录态 |

### VNC 远程登录

| 检查项 | 操作 | 预期结果 |
|--------|------|----------|
| noVNC 访问 | 浏览器打开 `http://<ECS_IP>/vnc/` | 看到 VNC 桌面 |
| 浏览器登录 | 通过 Telegram 发送 `/login bilibili` | VNC 中浏览器打开 B 站登录页 |

### 完整工作流验证

1. **登录一个平台**：通过 `/login bilibili`，在 VNC 中完成手动扫码登录
2. **检查登录态**：发送 `/status`，确认 B 站显示"已登录"
3. **拉取数据**：发送"看看 B 站最近的数据"，验证数据拉取 Skill 工作
4. **内容创作**：发送"帮我写一篇关于 AI 的文章"，验证 content-pipeline 工作
5. **发布内容**：发送"发布到 B 站"，验证 publish Skill 工作（建议先用草稿模式）

---

## 故障排查

| 问题 | 排查方法 |
|------|----------|
| 容器启动失败 | `docker compose logs <service>` 查看详细日志 |
| 数据库连接失败 | 确认 `.env` 中密码正确，`docker compose ps` 查看 postgres 状态 |
| Web 应用 502 | `docker compose logs web`，可能需要等待构建完成 |
| VNC 连不上 | 确认安全组放行 80 端口，`docker compose logs novnc` |
| Telegram Bot 无响应 | 确认 `.env` 中 `TELEGRAM_BOT_TOKEN` 正确 |
| 构建速度慢 | 确认 Docker Hub 镜像加速生效：`docker info \| grep Mirror` |
| 磁盘空间不足 | `docker system prune -a` 清理未使用的镜像和容器 |

---

## Legacy 部署（裸机/非 Docker）

<details>
<summary>点击展开裸机部署步骤</summary>

### Step 1: 创建用户并登录

```bash
ssh root@<ECS_IP>
adduser creator
usermod -aG sudo creator
su - creator
```

### Step 2: 克隆代码

```bash
git clone https://github.com/SecureAI-Team/creator.git ~/creator
cd ~/creator
```

### Step 3: 安装系统依赖

```bash
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
```

### Step 4: 安装 PostgreSQL

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE USER creator WITH PASSWORD 'your-password';"
sudo -u postgres psql -c "CREATE DATABASE creator_saas OWNER creator;"
```

### Step 5: 安装 Node.js 22.x

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 6: 安装 OpenClaw + Playwright

```bash
npm install -g openclaw
npx playwright install chromium
npx playwright install-deps chromium
```

### Step 7: 安装 VNC

```bash
sudo apt-get install -y tigervnc-standalone-server novnc websockify
```

### Step 8: 构建 Web 应用

```bash
cd ~/creator/web
cp .env.example .env
vim .env  # 填入配置
npm ci
npx prisma generate
npx prisma db push
npm run build
PORT=3001 npm run start
```

### Step 9: 配置 Nginx

```bash
sudo cp scripts/nginx-saas.conf /etc/nginx/sites-available/creator
sudo ln -sf /etc/nginx/sites-available/creator /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
```

### Step 10: 启动 OpenClaw

```bash
cd ~/creator
openclaw onboard
openclaw start
```

### 进程管理（systemd）

```bash
sudo cp scripts/openclaw.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable openclaw
sudo systemctl start openclaw
```

</details>
