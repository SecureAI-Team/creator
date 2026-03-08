# OpenClaw 能力与项目匹配映射

本文档说明 OpenClaw 能力在 Creator 项目中的使用方式、Bridge 命令与 platform-scripts / Skills 的对应关系，以及推荐用户入口。**项目面向个人创作者**：单账号为主，流程以登录 → 数据 → 发布为核心。

---

## 一、OpenClaw 能力清单与项目使用

| OpenClaw 能力 | 项目中的使用 | 匹配状态 |
|---------------|----------------|----------|
| **Gateway** | 桌面 main.js 启动 `openclaw gateway`；Web 通过 bridge 或 OPENCLAW_URL 发消息 | 已用 |
| **browser**（open/navigate/snapshot/click/type/fill/press/upload/cookies/screenshot/wait） | platform-scripts 通过 CLI 调用；Agent 对话时也可用内置 browser 工具 | 已用 |
| **browser profiles** | platforms.yaml / tools.yaml 引用 profile 名；桌面 getProfileName 对 default 返回 `openclaw`；repo openclaw.json 已包含 `openclaw` profile | 已对齐 |
| **skills.load** | 桌面 ensureWorkspaceSkills 将 repo `skills/` 拷到 workspace/skills；OpenClaw 从 workspace 加载 | 已用 |
| **cron** | openclaw.json 启用；定时发布由 Web 侧 cron 调 API，未用 OpenClaw 原生 cron | 可选增强 |
| **hooks**（session-memory, command-logger, publish-log 等） | openclaw.json 已配置 | 已用 |
| **models**（dashscope） | openclaw.json 与桌面生成 config 均配置 | 已用 |
| **sessions_spawn**（Sub-Agent） | multi-publish SKILL 描述并行发布；实际发布走 bridge `/publish` | 文档级 |
| **ClawHub / Lobster / OpenProse** | 见 [openclaw-ecosystem.md](openclaw-ecosystem.md)；OpenProse 在 openclaw.json 中 disabled | 待规划 |

---

## 二、Bridge 命令 ↔ platform-scripts ↔ Skills 对照表

| 用户意图 | Bridge 命令 | 实际执行（platform-scripts） | 对应 Skill（Agent 路径） |
|----------|-------------|------------------------------|---------------------------|
| 刷新平台数据 | `/data refresh <platform> [accountId]` | `runDataRefresh` → `*-data.js` | data-bilibili, data-douyin, data-weixin-mp 等 |
| 发布内容到平台 | `/publish <JSON payload>` | `publishToPlatform` → `bilibili.js`, `weixin-mp.js` 等 | publish-bilibili, publish-weixin-mp 等 |
| 采集评论 | `/comments fetch` 或 `/comments <platform>` | `collectComments` → comments.js | comment-monitor |
| 回复评论 | `/comments reply <JSON>` | `replyToComment` → comments.js | comment-monitor |
| 采集热搜/热点 | `/trends fetch` 或 `/trending [platforms]` | `collectTrending` → trending.js | trending-monitor |
| 打开平台登录页 | `/login <platform> [accountId]` | onOpenUrl（browser open/navigate） | platform-login |
| 检查登录态 | `/status <platform> [accountId]` | Gateway RPC browser.cookies 或 CLI cookies | auth-status |

Bridge 命令由 [desktop/bridge.js](../desktop/bridge.js) 拦截后调用 [desktop/platform-scripts/index.js](../desktop/platform-scripts/index.js) 导出的函数，不经过 OpenClaw Agent。Skills 供 Agent 在**对话**中按 SKILL.md 描述使用 browser 等工具执行同类任务，与 platform-scripts 是同一业务能力的双轨实现。

---

## 三、双轨执行说明

- **Bridge 直连路径**：Web 发 `/data refresh`、`/publish`、`/comments`、`/trends`、`/login`、`/status` → Bridge 拦截 → 桌面端执行 **platform-scripts**（Node 调用 OpenClaw **CLI**）→ 结果回 Web。确定性高，用于 Web/API 触发的数据、发布、评论、热点。
- **Agent 路径**：用户自然语言消息 → 发往 OpenClaw Gateway → **Agent** 根据 **Skills**（SKILL.md）使用 browser/lobster 等工具逐步执行。灵活，用于对话中的操作。

同一种能力（如「拉取 B 站数据」）可由两种方式完成：通过 Web 数据页/发布流程或 Bridge 命令由桌面端直接执行；或在聊天中说「拉取 B 站数据」由 Agent 按 data-bilibili Skill 操作。

---

## 四、推荐用户入口

| 能力 | 推荐入口 | 说明 |
|------|----------|------|
| 数据刷新 | Web 数据页「刷新数据」按钮 | 调用 POST /api/data/refresh，经 bridge 发 `/data refresh`，结果落库并展示 |
| 发布内容 | Web 内容详情页「发布」流程 | 调用 POST /api/content/[id]/publish，经 bridge 发 `/publish`，支持多平台与定时 |
| 评论管理 | Web 评论页「刷新评论」+ 列表回复 | 调用 POST /api/comments/refresh 与 PATCH /api/comments，经 bridge 发 `/comments` |
| 热点/趋势 | Web 趋势页「刷新热点」 | 调用 POST /api/trends/refresh，经 bridge 发 `/trends fetch` |
| 平台登录 | Web 平台页「登录」或对话中 `/login <平台>` | 打开对应平台登录页，由用户完成扫码/登录 |
| 对话中执行 | 聊天中说明 `/data refresh <平台>`、`/publish` 等 | 需桌面已连接 bridge，与上述 API 效果一致 |

---

## 五、评论 / 热点支持的平台

- **评论采集与回复**（comments.js COMMENT_PAGES）：bilibili、douyin、xiaohongshu、weixin-mp、weixin-channels、kuaishou、zhihu、weibo、toutiao。YouTube 评论在 Studio 内单独管理，暂不纳入统一评论采集。
- **热搜/热点**（trending.js TRENDING_PAGES）：douyin、weibo、zhihu、bilibili、toutiao、baidu。其中 **baidu** 仅作热点来源，不在 platforms.yaml 发布/数据平台中；其余与发布平台重叠。

发布与数据平台以 [workspace/config/platforms.yaml](../workspace/config/platforms.yaml) 为准；评论与热点平台以 desktop/platform-scripts 中 COMMENT_PAGES / TRENDING_PAGES 为准。
