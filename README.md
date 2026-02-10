# 自媒体创作助手 (Creator Assistant)

基于 [OpenClaw](https://docs.clawd.bot) 框架的个人自媒体创作助手。一个人也能高效运营多平台。

## 功能

- **选题研究**：热点监控 + 趋势分析，推荐选题方向
- **内容创作**：通过浏览器 RPA 驱动多种 AI 工具（文本/图片/视频/音频/数字人）
- **多平台发布**：支持 10 大平台（YouTube、B站、抖音、小红书、视频号、公众号、快手、知乎、微博、头条号）
- **数据跟踪**：自动拉取各平台数据，生成可视化日报和趋势图
- **封面自动生成**：按各平台尺寸要求自动生成封面/缩略图
- **评论管理**：各平台评论监控 + 智能回复建议
- **热点监控**：定时抓取各平台热搜，推送高相关度选题
- **定时发布**：Cron 定时自动发布
- **工具可插拔**：自由配置你偏好的 AI 创作工具（20+ 工具支持）
- **自然语言交互**：直接说「帮我写一篇文章」即可，不必记指令

## 支持平台

| 平台 | 内容类型 | 发布 | 数据 | 评论 |
|------|----------|------|------|------|
| B站 (哔哩哔哩) | 视频, 文章 | ✅ | ✅ | ✅ |
| 小红书 | 图文, 视频 | ✅ | ✅ | ✅ |
| 微信公众号 | 图文 | ✅ | ✅ | ✅ |
| 微信视频号 | 视频 | ✅ | ✅ | ✅ |
| 抖音 | 视频 | ✅ | ✅ | ✅ |
| YouTube | 视频 | ✅ | ✅ | ✅ |
| 快手 | 视频 | ✅ | ✅ | ✅ |
| 知乎 | 文章, 视频 | ✅ | ✅ | ✅ |
| 微博 | 图文, 视频 | ✅ | ✅ | ✅ |
| 头条号 | 图文, 视频 | ✅ | ✅ | ✅ |

## AI 工具矩阵

| 类别 | 工具 | 默认 | 说明 |
|------|------|------|------|
| **文本生成** | ChatGPT Deep Thinking | ✅ | 深度思考文本创作 |
| | Claude, DeepSeek, Gemini, Kimi, 通义千问 Web | | 可选替代 |
| **视频生成** | NotebookLM Studio | ✅ | 播客/概览式视频 |
| | 可灵 AI (Kling), 即梦 AI, Sora, Runway | | 文/图生视频 |
| **图片生成** | DALL-E (via ChatGPT) | ✅ | 封面/配图/海报 |
| | Midjourney, 通义万相 | | 高质量图片 |
| **音频/TTS** | Suno AI | ✅ | 音乐/背景音乐 |
| | ElevenLabs, Fish Audio | | 语音合成/配音 |
| **数字人** | HeyGen | | AI 口播视频 |
| | 蝉镜 AI | | 国内数字人口播 |

所有工具均通过浏览器 RPA 操作，可在 `workspace/config/tools.yaml` 中自由启用/禁用。

## 快速开始

### 1. 部署环境 (阿里云 ECS)

```bash
# 上传项目到 ECS
scp -r . user@your-ecs-ip:~/creator

# SSH 到 ECS
ssh user@your-ecs-ip

# 运行安装脚本
cd ~/creator
bash scripts/setup-ecs.sh
```

### 2. 配置环境变量

```bash
# 复制模板并填入真实值
cp .env.example ~/.env.creator
vim ~/.env.creator
# 必填: DASHSCOPE_API_KEY
# 推荐: TELEGRAM_BOT_TOKEN, TELEGRAM_USER_ID

source ~/.env.creator
```

### 3. 配置进程管理（二选一）

```bash
# 方案 A: systemd（推荐）
# 编辑 scripts/openclaw.service 替换 <YOUR_USER>
sudo cp scripts/openclaw.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable openclaw
sudo systemctl start openclaw

# 方案 B: PM2
npm install -g pm2
pm2 start scripts/ecosystem.config.js
pm2 save && pm2 startup
```

### 4. 启动 OpenClaw

```bash
cd ~/creator
openclaw onboard    # 首次初始化
openclaw start      # 启动 Gateway（如未使用进程管理器）
```

### 5. 配置 Telegram

```bash
bash scripts/setup-telegram.sh
```

### 6. 登录各平台

```bash
# 启动 VNC（用于远程操作浏览器）
bash scripts/start-vnc.sh

# 在 Telegram 中对助手说：
/start               # 交互式引导
# 或手动登录：
/login bilibili
/login xiaohongshu
/login chatgpt
# ... 按提示完成登录
```

### 7. 初始化 Cron 任务

```bash
bash scripts/setup-cron-jobs.sh
```

### 8. 配置运维自动化（可选但推荐）

```bash
# 添加到系统 crontab
crontab -e

# 每 5 分钟监控 Gateway 健康
*/5 * * * * ~/creator/scripts/monitor-gateway.sh >> ~/creator/logs/monitor.log 2>&1
# 每天凌晨 2 点清理磁盘
0 2 * * * ~/creator/scripts/cleanup-workspace.sh >> ~/creator/logs/cleanup.log 2>&1
# 每天凌晨 3 点备份
0 3 * * * ~/creator/scripts/backup-workspace.sh >> ~/creator/logs/backup.log 2>&1
```

## 常用指令

| 指令 | 说明 |
|------|------|
| `/help` | 显示所有指令和使用说明 |
| `/start` | 首次使用交互式引导 |
| `/topic [领域]` | 推荐选题 |
| `/trending` | 查看各平台热搜热点 |
| `/write [--tool 名] <选题>` | 文本创作 |
| `/video [--tool 名] <选题>` | 视频创作 |
| `/cover <描述>` | 生成封面/缩略图 |
| `/publish <平台>` | 发布到平台（支持多个） |
| `/schedule <时间> <平台>` | 定时发布 |
| `/data [平台]` | 查看数据 |
| `/data trend` | 查看趋势图 |
| `/comments [平台]` | 查看评论 |
| `/drafts` | 查看草稿 |
| `/tools` | 管理创作工具 |
| `/login <名称>` | 登录平台/工具 |
| `/auth` | 查看登录状态 |
| `/settings` | 修改偏好设置 |
| `/cancel` | 取消当前操作 |
| `/vnc` | VNC 使用指南 |

你也可以直接用自然语言：「帮我写篇 AI 文章」「发到小红书」「最近数据怎么样」「今天有什么热点」「看看评论」

## 项目结构

```
creator/
├── SOUL.md                        # Agent 人格定义
├── IDENTITY.md                    # Agent 身份和能力声明
├── AGENTS.md                      # 多 Agent 协作说明
├── openclaw.json                  # OpenClaw 主配置
├── .env.example                   # 环境变量模板
├── .gitignore                     # Git 忽略规则
│
├── skills/                        # Skills 目录（四层架构）
│   │
│   │ # 第 1 层：工具 RPA Skills（可插拔，20+ 工具）
│   │ ## 文本生成
│   ├── tool-chatgpt/              # ChatGPT Deep Thinking
│   ├── tool-claude/               # Claude
│   ├── tool-deepseek/             # DeepSeek
│   ├── tool-gemini/               # Gemini
│   ├── tool-kimi/                 # Kimi (Moonshot)
│   ├── tool-qwen-web/             # 通义千问 Web
│   │ ## 视频生成
│   ├── tool-notebooklm/           # NotebookLM Studio
│   ├── tool-kling/                # 可灵 AI (快手)
│   ├── tool-jimeng/               # 即梦 AI (字节)
│   ├── tool-sora/                 # Sora (OpenAI)
│   ├── tool-runway/               # Runway
│   │ ## 图片生成
│   ├── tool-midjourney/           # Midjourney
│   ├── tool-dalle/                # DALL-E (via ChatGPT)
│   ├── tool-tongyi-wanxiang/      # 通义万相 (阿里)
│   │ ## 音频/TTS
│   ├── tool-suno/                 # Suno AI
│   ├── tool-elevenlabs/           # ElevenLabs
│   ├── tool-fishaudio/            # Fish Audio
│   │ ## 数字人/Avatar
│   ├── tool-heygen/               # HeyGen
│   ├── tool-chanjing/             # 蝉镜 AI
│   │
│   │ # 第 2 层：业务流程 Skills
│   ├── content-pipeline/          # 通用创作流水线
│   ├── content-adapt/             # 平台格式适配
│   ├── topic-research/            # 选题研究
│   ├── media-handler/             # 媒体文件处理
│   ├── cover-generator/           # 封面自动生成
│   │
│   │ # 第 3 层：平台 Skills（发布 + 数据，10 平台）
│   ├── publish-bilibili/          # B站发布
│   ├── publish-xiaohongshu/       # 小红书发布
│   ├── publish-weixin-mp/         # 公众号发布
│   ├── publish-weixin-channels/   # 视频号发布
│   ├── publish-douyin/            # 抖音发布
│   ├── publish-youtube/           # YouTube 发布
│   ├── publish-kuaishou/          # 快手发布
│   ├── publish-zhihu/             # 知乎发布
│   ├── publish-weibo/             # 微博发布
│   ├── publish-toutiao/           # 头条号发布
│   ├── multi-publish/             # 多平台并行发布
│   ├── unpublish/                 # 撤回/删除已发布内容
│   ├── data-bilibili/             # B站数据
│   ├── data-xiaohongshu/          # 小红书数据
│   ├── data-youtube/              # YouTube 数据
│   ├── data-weixin-mp/            # 公众号数据
│   ├── data-douyin/               # 抖音数据
│   ├── data-weixin-channels/      # 视频号数据
│   ├── data-kuaishou/             # 快手数据
│   ├── data-zhihu/                # 知乎数据
│   ├── data-weibo/                # 微博数据
│   ├── data-toutiao/              # 头条号数据
│   ├── daily-report/              # 每日数据日报（含可视化图表）
│   ├── data-query/                # 数据查询（含趋势图和跨平台对比）
│   │
│   │ # 第 4 层：运营增强 Skills
│   ├── comment-monitor/           # 评论管理 + 智能回复
│   ├── trending-monitor/          # 热搜热点监控
│   │
│   │ # 管理与交互 Skills
│   ├── help/                      # /help 帮助中心
│   ├── onboarding/                # /start 首次引导
│   ├── platform-login/            # /login 统一登录
│   ├── tools-manager/             # /tools 工具管理
│   ├── auth-status/               # /auth 登录状态
│   ├── drafts-manager/            # /drafts 草稿管理
│   ├── schedule-publish/          # /schedule 定时发布
│   ├── cancel-operation/          # /cancel 取消操作
│   ├── preferences/               # /settings 偏好设置
│   └── vnc-guide/                 # /vnc 远程操作指南
│
├── hooks/                         # Hooks 目录
│   ├── auth-health-check/         # 登录态巡检
│   ├── publish-log/               # 发布日志索引
│   ├── content-log/               # 草稿索引
│   └── trending-monitor/          # 热点自动监控
│
├── workspace/                     # Workspace Memory
│   ├── config/
│   │   ├── tools.yaml             # 工具注册表（20+ 工具）
│   │   ├── platforms.yaml         # 平台注册表（10 平台）
│   │   ├── channels.yaml          # 渠道配置
│   │   ├── user-preferences.yaml  # 用户偏好设置
│   │   └── tool-skill-template.md # 工具 Skill 模板
│   ├── content/
│   │   ├── drafts/                # 草稿
│   │   ├── adapted/               # 适配版本
│   │   ├── media/                 # 媒体文件（images/videos/docs）
│   │   ├── screenshots/           # 截图
│   │   └── published/             # 发布记录
│   ├── topics/                    # 选题库 + 热点数据
│   ├── data/                      # 数据快照 + 日报
│   ├── auth/                      # 登录状态记录
│   ├── prompts/                   # 提示词模板
│   │   ├── chatgpt/
│   │   └── notebooklm/
│   └── workflows/                 # OpenProse 工作流
│       ├── content-pipeline.prose # 内容创作流水线
│       └── daily-operations.prose # 每日运营流水线
│
├── scripts/                       # 部署和运维脚本
│   ├── setup-ecs.sh               # ECS 初始化
│   ├── start-gateway.sh           # 启动 Gateway
│   ├── start-vnc.sh               # 启动 VNC（密码保护）
│   ├── setup-telegram.sh          # Telegram 配置向导
│   ├── setup-cron-jobs.sh         # Cron 任务初始化
│   ├── deploy.sh                  # 代码更新部署
│   ├── monitor-gateway.sh         # 健康监控 + Telegram 告警
│   ├── cleanup-workspace.sh       # 磁盘清理
│   ├── backup-workspace.sh        # 数据备份
│   ├── openclaw.service           # systemd 服务单元
│   ├── ecosystem.config.js        # PM2 配置
│   ├── nginx-webchat.conf         # Nginx HTTPS 反向代理
│   └── logrotate-openclaw.conf    # 日志轮转配置
│
├── docs/                          # 文档
│   ├── ecs-security-groups.md     # ECS 安全组配置指南
│   ├── reference-social-auto-upload.md  # 参考: social-auto-upload 项目
│   ├── reference-mediacrawler.md  # 参考: MediaCrawler 项目
│   └── openclaw-ecosystem.md      # OpenClaw 生态集成指南
│
├── src/                           # 类型定义
│   └── hooks/hooks.ts             # Hook 类型
│
├── logs/                          # 运行日志（gitignored）
└── backups/                       # 数据备份（gitignored）
```

## 添加新的 AI 工具

1. 在 `workspace/config/tools.yaml` 中添加工具配置
2. 在 `skills/` 下创建 `tool-<name>/SKILL.md`（参考 `workspace/config/tool-skill-template.md`）
3. 可选：在 `workspace/prompts/<name>/` 下添加提示词模板
4. 启用工具：`/tools enable <name>`
5. 登录：`/login <name>`

## 添加新的发布平台

1. 在 `workspace/config/platforms.yaml` 中添加平台配置
2. 在 `openclaw.json` 的 `browser.profiles` 中添加浏览器配置
3. 创建 `skills/publish-<name>/SKILL.md` 和 `skills/data-<name>/SKILL.md`
4. 登录：`/login <name>`

## 运维

| 脚本 | 用途 | 建议频率 |
|------|------|----------|
| `monitor-gateway.sh` | 监控 Gateway + Telegram 告警 | 每 5 分钟 |
| `cleanup-workspace.sh` | 清理旧截图/日志/临时文件 | 每天凌晨 |
| `backup-workspace.sh` | 备份配置和内容 | 每天凌晨 |
| `deploy.sh` | 拉取更新 + 重启 | 按需 |

详细安全配置见 `docs/ecs-security-groups.md`。

## 参考项目

本项目在设计和实现中参考了以下优秀开源项目：

- **[social-auto-upload](https://github.com/dreammis/social-auto-upload)** (8400+ stars) — Playwright 多平台视频自动上传，参考了其各平台 RPA 逻辑和元素选择策略
- **[MediaCrawler](https://github.com/NanmiCoder/MediaCrawler)** (43,600+ stars) — 多平台自媒体数据爬虫，参考了其反爬策略和数据提取逻辑
- **[MultiPost Extension](https://github.com/leaperone/MultiPost-Extension)** (2,100+ stars) — 浏览器多平台一键发布插件

详见 `docs/` 目录下的参考文档。

## 技术栈

- **框架**：OpenClaw (Gateway + Agent + OpenProse 工作流)
- **LLM**：阿里云 Qwen (DashScope API)
- **浏览器自动化**：Playwright + Chromium (headless)
- **服务器**：阿里云 ECS
- **进程管理**：systemd / PM2
- **远程操控**：VNC + noVNC（密码保护）
- **渠道**：Telegram / WeChat / WebChat
- **监控**：自定义脚本 + Telegram 告警
