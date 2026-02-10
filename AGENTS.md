# AGENTS — 多 Agent 协作说明

## Agent 架构

本系统采用单主 Agent + Sub-Agent 模式：

### 主 Agent（默认）

- **模型**：`dashscope/qwen-max` 或 `dashscope/qwen-plus`
- **职责**：
  - 理解创作者意图
  - 查询工具注册表，选择合适的创作工具
  - 构造提示词并驱动 Browser RPA
  - 解析工具输出，适配各平台格式
  - 编排创作 -> 审核 -> 发布的完整工作流
  - 数据分析与日报汇总
  - 与创作者的所有对话交互

### Sub-Agent（发布/数据/监控任务）

- **模型**：`dashscope/qwen-turbo`（低成本）
- **触发场景**：
  - 并行发布到多个平台时，每个平台 spawn 一个 Sub-Agent
  - 并行拉取多个平台数据时
  - 并行抓取各平台热搜/热点时
  - 并行检查各平台评论时
- **特点**：
  - 每个 Sub-Agent 操作独立的 Browser Profile
  - 完成后 announce 结果回主 Chat
  - 最大并发：4

## 工具可用性

### 主 Agent 可用工具

- `browser`：浏览器自动化（navigate / snapshot / click / type / screenshot 等）
- `lobster`：文件读写
- `exec`：执行命令
- `web`：HTTP 请求（用于有 API 的平台）
- `llm_task`：委派子任务给 Qwen（格式适配、标签生成等）
- `cron`：创建/管理定时任务
- `sessions_spawn`：创建 Sub-Agent

### Sub-Agent 可用工具

- `browser`：浏览器自动化
- `lobster`：文件读写
- `web`：HTTP 请求

## 工作流编排原则

1. **串行创作，并行发布**：内容创作在主 Agent 中完成（需要创作者审核），发布阶段可并行
2. **失败隔离**：单个平台发布失败不影响其他平台
3. **结果汇总**：所有 Sub-Agent 结果汇总到主 Chat，创作者在一处查看
4. **并行数据/监控**：数据拉取、热点监控、评论抓取均可并行执行

## OpenProse 工作流（可选增强）

可启用 OpenProse 插件，使用 `.prose` 文件编排确定性工作流：
- `workspace/workflows/content-pipeline.prose`：内容研究 → 创作 → 适配
- `workspace/workflows/daily-operations.prose`：热点 + 数据 + 评论并行检查

使用方式：`/prose run workspace/workflows/<file>.prose`

详见 `docs/openclaw-ecosystem.md`。
