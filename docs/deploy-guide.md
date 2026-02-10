# ECS 部署与功能验证指南

本文档描述如何将自媒体创作助手从 GitHub 部署到阿里云 ECS 服务器（Ubuntu 24.04），并完成功能验证。

---

## 前置条件

- 阿里云 ECS 实例（推荐 Ubuntu 24.04 LTS，2C4G 及以上）
- 安全组已放行必要端口（参见 [ecs-security-groups.md](./ecs-security-groups.md)）
- 已获取阿里云 DashScope API Key（[控制台](https://dashscope.console.aliyun.com/)）
- 已创建 Telegram Bot（可选但推荐，通过 @BotFather 获取 Token）

---

## Step 1: 创建用户并登录

```bash
# SSH 到 ECS（首次用 root）
ssh root@<ECS_IP>

# 创建专用用户（推荐，避免 root 运行）
adduser creator
usermod -aG sudo creator

# 切换到新用户
su - creator
```

---

## Step 2: 克隆代码

```bash
git clone https://github.com/SecureAI-Team/creator.git ~/creator
cd ~/creator
```

---

## Step 3: 运行环境部署脚本

```bash
bash scripts/setup-ecs.sh
```

该脚本会自动安装：
- 系统依赖（字体、Chromium 依赖库等）
- Node.js 22.x（OpenClaw 要求 ≥ 22.12.0）
- OpenClaw CLI（全局安装）
- Playwright + Chromium 浏览器
- VNC 服务（用于远程手动登录平台）

验证安装：

```bash
node -v          # 应 >= v22.12.0
openclaw --version
```

---

## Step 4: 配置环境变量

```bash
cp .env.example ~/.env.creator
vim ~/.env.creator
```

**必填项：**

| 变量 | 说明 | 获取方式 |
|------|------|----------|
| `DASHSCOPE_API_KEY` | 通义千问 API Key | [DashScope 控制台](https://dashscope.console.aliyun.com/) |

**推荐填写：**

| 变量 | 说明 | 获取方式 |
|------|------|----------|
| `TELEGRAM_BOT_TOKEN` | Telegram 机器人 Token | @BotFather |
| `TELEGRAM_USER_ID` | 你的 Telegram 用户 ID | @userinfobot |
| `VNC_PASSWORD` | VNC 远程登录密码（至少 6 位） | 自定义 |

加载环境变量：

```bash
source ~/.env.creator
```

> **提示**: 可将 `source ~/.env.creator` 追加到 `~/.bashrc`，确保每次登录自动加载。

---

## Step 5: 启动 OpenClaw

```bash
cd ~/creator

# 首次运行：初始化 OpenClaw 工作区
openclaw onboard

# 启动 Gateway
openclaw start
```

观察启动日志，确认无报错。

---

## Step 6: 功能验证清单

### 6.1 基础功能

| 检查项 | 操作 | 预期结果 |
|--------|------|----------|
| Gateway 启动 | `openclaw start` | 无错误，进程正常运行 |
| 配置加载 | 查看 Gateway 日志 | tools.yaml、platforms.yaml 正确解析 |
| Skill 加载 | 日志中搜索 `skill` | 60 个 Skill 全部加载 |

### 6.2 Telegram 交互（如已配置）

| 检查项 | 操作 | 预期结果 |
|--------|------|----------|
| Bot 响应 | 发送 `/help` 给 Bot | 返回帮助信息 |
| Skill 调用 | 发送 `/tools list` | 列出所有已注册工具 |
| Skill 调用 | 发送 `/status` | 显示各平台登录态 |

### 6.3 VNC 远程登录

```bash
# 启动 VNC 服务
bash scripts/start-vnc.sh
```

| 检查项 | 操作 | 预期结果 |
|--------|------|----------|
| VNC 启动 | 执行上面的命令 | 无报错 |
| noVNC 访问 | 浏览器打开 `http://<ECS_IP>:6080` | 看到 VNC 桌面 |
| 浏览器登录 | 通过 Telegram 发送 `/login bilibili` | VNC 中浏览器打开 B 站登录页 |

### 6.4 Cron 任务

```bash
# 初始化定时任务
bash scripts/setup-cron-jobs.sh

# 验证任务列表
openclaw cron list
```

| 检查项 | 预期结果 |
|--------|----------|
| 任务数量 | 应列出 6 个 Cron 任务 |
| 任务内容 | 包含 daily-report、data 拉取、trending-monitor 等 |

### 6.5 完整工作流验证

以下为端到端测试（需要先完成平台登录）：

1. **登录一个平台**：通过 `/login bilibili`，在 VNC 中完成手动扫码登录
2. **检查登录态**：发送 `/status`，确认 B 站显示"已登录"
3. **拉取数据**：发送"看看 B 站最近的数据"，验证数据拉取 Skill 工作
4. **内容创作**：发送"帮我写一篇关于 AI 的文章"，验证 content-pipeline 工作
5. **发布内容**：发送"发布到 B 站"，验证 publish Skill 工作（建议先用草稿模式）

---

## Step 7: 进程管理（systemd）

将 OpenClaw 配置为系统服务，实现开机自启和异常重启：

```bash
# 复制 service 文件
sudo cp scripts/openclaw.service /etc/systemd/system/

# 编辑 service 文件，替换用户名
sudo vim /etc/systemd/system/openclaw.service
# 将 <YOUR_USER> 替换为 creator
# 将工作目录和路径调整为实际值

# 启用并启动
sudo systemctl daemon-reload
sudo systemctl enable openclaw
sudo systemctl start openclaw

# 查看状态
sudo systemctl status openclaw
```

---

## Step 8: 后续更新

当本地代码推送到 GitHub 后，在 ECS 上执行：

```bash
cd ~/creator
bash scripts/deploy.sh
```

`deploy.sh` 会自动完成：
- Stash 本地变更（如 workspace 数据）
- `git pull` 拉取最新代码
- 恢复本地变更
- 重启 OpenClaw 服务

---

## 可选配置

### 日志轮转

```bash
sudo cp scripts/logrotate-openclaw.conf /etc/logrotate.d/openclaw
```

### 定期清理

```bash
# 添加到 crontab（每周日凌晨 3 点运行）
crontab -e
# 添加: 0 3 * * 0 /home/creator/creator/scripts/cleanup-workspace.sh
```

### 自动备份

```bash
# 添加到 crontab（每天凌晨 2 点运行）
crontab -e
# 添加: 0 2 * * * /home/creator/creator/scripts/backup-workspace.sh
```

### 健康监控

```bash
# 添加到 crontab（每 5 分钟运行）
crontab -e
# 添加: */5 * * * * /home/creator/creator/scripts/monitor-gateway.sh
```

---

## 故障排查

| 问题 | 排查方法 |
|------|----------|
| Gateway 启动失败 | 检查 `~/.env.creator` 是否已加载；查看日志 `journalctl -u openclaw` |
| Telegram Bot 无响应 | 确认 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_USER_ID` 正确 |
| 浏览器 RPA 报错 | 检查 Chromium 依赖：`npx playwright install-deps chromium` |
| VNC 连不上 | 确认安全组放行 6080 端口；检查 `vncserver` 是否运行 |
| Skill 未加载 | 确认 `skills/` 目录下每个子目录都有 `SKILL.md` |
| Node.js 版本不对 | `node -v` 应 ≥ 22.12.0；若不对重新运行 `setup-ecs.sh` |
