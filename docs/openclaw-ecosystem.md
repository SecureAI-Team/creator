# OpenClaw 生态集成指南

## 概述
本文档梳理了 OpenClaw 生态中可以为自媒体创作助手所用的组件和资源。

---

## 1. ClawHub — 技能目录

> 地址: https://clawhub.ai
> GitHub: https://github.com/openclaw/clawhub

ClawHub 是 OpenClaw 官方的技能注册表和搜索引擎。

### 可复用技能类别
- **Productivity**: Gmail、Google Calendar、Notion、Obsidian
- **Developer Tools**: GitHub、Shell、Docker
- **Information Retrieval**: Web search、Wikipedia、Weather、News
- **Media**: YouTube、Twitter/X、Spotify

### 搜索方式
ClawHub 使用向量搜索（OpenAI text-embedding-3-small），可以用自然语言搜索：
```
搜索示例:
- "browser automation upload video"
- "web scraping social media"
- "schedule cron task"
```

### 安装技能
```bash
# CLI 方式
openclaw skills install <skill-name>

# 或在 openclaw.json 中配置
# skills.load 配置
```

### 推荐探索的技能
- **浏览器自动化类**: 可能有现成的表单填写、文件上传自动化 skill
- **Web 抓取类**: 可能有现成的数据提取 skill
- **通知类**: Gmail/Calendar 集成，用于内容排期提醒
- **GitHub**: 可用于版本管理创作内容

---

## 2. Lobster — 工作流引擎

> GitHub: https://github.com/clawdbot/lobster

Lobster 是 OpenClaw 原生的工作流 Shell，一个类型化的、本地优先的"宏引擎"。

### 核心能力
- 将 Skills 和 Tools 组合成**确定性流水线**
- Agent 可以单步调用整个工作流
- 比纯 Agent 编排更可靠（不依赖 LLM 判断执行顺序）

### 适用场景
对于我们的自媒体创作助手，以下流程适合用 Lobster 编排：

#### 内容创作流水线
```
选题确认 → 文本生成(tool-chatgpt) → 审核确认 → 平台适配(content-adapt) → 封面生成(cover-generator) → 发布(multi-publish)
```

#### 每日运营流水线
```
热点监控(trending-monitor) → 数据拉取(data-*) → 日报生成(daily-report) → 评论检查(comment-monitor) → 推送通知
```

#### 多平台发布流水线
```
内容确认 → 并行发布[bilibili, douyin, xiaohongshu, ...] → 汇总结果 → 记录日志
```

### 与纯 Agent 编排的对比
| 维度 | 纯 Agent 编排 | Lobster 流水线 |
|------|--------------|----------------|
| 灵活性 | 高（LLM 动态决策）| 中（预定义流程）|
| 可靠性 | 中（LLM 可能跳步）| 高（确定性执行）|
| 速度 | 慢（每步需 LLM 推理）| 快（直接执行）|
| 适用场景 | 创意任务、问答 | 重复性流程、批量任务 |

### 建议
- **Phase 1 (当前)**：使用纯 Agent 编排（已实现）
- **Phase 2 (优化)**：将常用且固定的流程迁移到 Lobster 流水线
- **混合模式**：Lobster 处理确定性步骤，Agent 处理需要判断的步骤

---

## 3. OpenProse — 多 Agent 工作流格式

> 文档: https://docs.clawd.bot/prose

OpenProse 是一种 Markdown-first 的便携式工作流格式，支持多 Agent 并行编排。

### 启用方式
```bash
openclaw plugins enable open-prose
# 重启 Gateway
```

### 使用方式
通过 `/prose` 命令调用：
```
/prose run <file.prose>
/prose help
```

### 适用于自媒体创作助手的 .prose 示例

#### 内容研究与创作
```prose
# 内容研究与创作流水线
input topic: "要研究的选题"
input platforms: "目标平台列表"

agent researcher:
  model: qwen-max
  prompt: "你是一个内容研究员，擅长分析热点话题和竞品内容。"

agent writer:
  model: qwen-max  
  prompt: "你是一个自媒体创作者，擅长各平台的内容创作。"

agent adapter:
  model: qwen-turbo
  prompt: "你擅长将内容适配到不同自媒体平台的格式要求。"

# 并行：研究和初稿
parallel:
  research = session: researcher
    prompt: "研究 {topic}，分析各平台上该话题的热门内容特点。"
  
  draft = session: writer
    prompt: "围绕 {topic} 创作一篇原创内容。"

# 合并研究结果和初稿
final_draft = session: writer
  prompt: "结合研究数据优化初稿。"
  context: { research, draft }

# 多平台适配
adapted = session: adapter
  prompt: "将内容适配到以下平台: {platforms}"
  context: { final_draft }
```

#### 每日数据汇总
```prose
# 每日数据汇总
agent data_collector:
  model: qwen-turbo
  prompt: "你负责收集各平台数据。"

agent analyst:
  model: qwen-max
  prompt: "你是数据分析师，擅长分析自媒体运营数据。"

# 并行拉取各平台数据
parallel:
  bilibili = session: data_collector
    prompt: "拉取 B站 最新数据。"
  douyin = session: data_collector
    prompt: "拉取抖音最新数据。"
  xiaohongshu = session: data_collector
    prompt: "拉取小红书最新数据。"

# 汇总分析
report = session: analyst
  prompt: "分析以下各平台数据，生成运营日报。"
  context: { bilibili, douyin, xiaohongshu }
```

### 文件位置
`.prose` 文件建议放在 `workspace/workflows/` 目录下：
```
workspace/
  workflows/
    content-pipeline.prose
    daily-operations.prose
    multi-publish.prose
```

---

## 4. 集成路线图

```
当前状态 (Phase 0):
  ✅ 纯 Agent 编排 + Skills

Phase 1 - ClawHub 探索:
  🔲 搜索并安装有用的社区 skills
  🔲 关注 browser-automation 和 web-scraping 类 skills

Phase 2 - OpenProse 引入:
  🔲 创建 content-pipeline.prose
  🔲 创建 daily-operations.prose
  🔲 在 openclaw.json 中启用 open-prose 插件

Phase 3 - Lobster 引入:
  🔲 将固定流程迁移到 Lobster 流水线
  🔲 日报生成、多平台发布等确定性任务
```

---

## 5. 推荐配置变更

### openclaw.json 中启用 OpenProse
在已有的配置基础上添加 plugins 配置：
```json
{
  "plugins": {
    "open-prose": {
      "enabled": true
    }
  }
}
```

### 新增 workflows 目录
```
workspace/workflows/.gitkeep
```
