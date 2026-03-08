# 全面检查 — 能力与缺口审计

本文档基于三层架构（Creator Edge / SaaS Control Plane / Data & Insight Plane）与既有设计，对当前实现做缺口审计与修复记录。

---

## 一、已修复的缺口（本次补齐）

### 1. 评论采集与持久化
- **问题**：桌面端可通过 bridge 执行 `/comments` 采集各平台评论，但 Web 端没有接口将采集结果写入 `Comment` 表，评论管理页始终为空。
- **修复**：
  - 新增 `POST /api/comments/refresh`：通过 bridge 发送 `/comments`（或 `/comments <platform>`），解析返回的 `results` 或 `comments`，按平台先删后插写入 `Comment`。
  - 评论管理页增加「刷新评论」按钮，调用上述接口并刷新列表。

### 2. 配额校验未接入
- **问题**：`lib/quota.ts` 提供 `checkQuota` / `recordUsage`，但未在任何业务接口中调用，订阅限额未生效。
- **修复**：
  - **内容创建** `POST /api/content`：创建前 `checkQuota(userId, "content_create")`，超限返回 429；创建成功后 `recordUsage(userId, "content_create")`。
  - **数据刷新** `POST /api/data/refresh`：请求前 `checkQuota(userId, "data_refresh")`，超限返回 429；任一平台采集成功则 `recordUsage(userId, "data_refresh")`。
  - **发布** `POST /api/content/[id]/publish`：即时发布（非定时）前 `checkQuota(userId, "publish")`，超限返回 429；发起发布后 `recordUsage(userId, "publish")`。

---

## 二、当前能力核对（已具备）

| 能力 | 状态 | 说明 |
|------|------|------|
| 认证与路由保护 | ✅ | middleware 保护 `/overview`、`/platforms`、`/content`、`/media`、`/data`、`/comments`、`/trends`、`/team`、`/tasks`、`/settings`、`/vnc` |
| 热点/趋势 | ✅ | `Trend` 模型，GET/POST `/api/trends`，POST `/api/trends/refresh` 落库 |
| 规范化指标 | ✅ | `CanonicalMetrics`，`/api/data/canonical`，data/refresh 后写入 canonical |
| 原始数据留存 | ✅ | `PlatformMetricsRaw`，data/refresh 时 upsert |
| 洞察规则与 LLM 摘要 | ✅ | 11 条规则，`/api/data/insights`，`/api/data/insights/summary` |
| 订阅与用量 | ✅ | `Subscription` / `UsageRecord`，`/api/billing`，quota 已接入内容创建、数据刷新、发布 |
| 任务记录 | ✅ | `TaskExecution`，`/api/tasks`，任务中心页 |
| 定时发布与安全 | ✅ | `/api/cron/publish-scheduler` 支持 CRON_SECRET，systemd 示例 |
| 基准对比 | ✅ | `/api/data/benchmark`（需 PRO/ENTERPRISE） |
| 评论管理 | ✅ | GET/POST/PATCH/DELETE `/api/comments`，规则 CRUD，**评论刷新** 已接 bridge 并落库 |
| 实体映射模型 | ✅ | `Topic`、`ContentVariant`、`PlatformPost`、`AccountProfile` 已在 schema 中 |

### OpenClaw 生态组件

| 组件 | 状态 | 说明 |
|------|------|------|
| **ClawHub** | 探索中 | 官方技能目录，可搜索安装社区 skills（browser automation、web scraping 等），见 [openclaw-ecosystem.md](openclaw-ecosystem.md) |
| **Lobster** | Phase 2 | 确定性工作流引擎，将固定流程（日报、多平台发布）从 Agent 编排迁移为 Lobster 流水线，提升可靠性 |
| **OpenProse** | 可选（当前 disabled） | 多 Agent 工作流格式，`/prose run` 运行 .prose 文件；openclaw.json 中 `plugins.open-prose.enabled: false` |

能力与 Bridge 命令映射详见 [openclaw-capability-mapping.md](openclaw-capability-mapping.md)。

---

## 三、可选 / 后续增强

1. **Topic / ContentVariant / PlatformPost / AccountProfile**  
   模型已存在，暂无独立 CRUD API。可在「内容-话题关联」「多版本 A/B」「账号资料同步」等需求明确后再加接口与前端。

2. **AI 调用配额（ai_call）**  
   `checkQuota(userId, "ai_call")` 与 `recordUsage(userId, "ai_call")` 尚未在 Agent/聊天接口中接入，若需按日限制 AI 调用次数，可在 `/api/agent` 或流式接口中按请求校验并计次。

3. **数据采集准确性**  
   各平台采集脚本（抖音、小红书、B 站、视频号等）依赖页面结构，若平台改版需维护选择器与 `findMetric` 逻辑；校验与重试已在 desktop 端实现。

4. **评论去重策略**  
   当前评论刷新采用「按平台先删后插」。若需保留历史且去重，可考虑按 `platform + author + body` 或外部 ID 做 upsert，并保留 `fetchedAt` 用于清理旧数据。

5. **data_refresh / publish 限额字段**  
   当前 `data_refresh` 与 `publish` 复用 `maxContentPerDay` 的默认值；若产品上希望单独限制「每日数据刷新次数」或「每日发布次数」，可在 `Subscription` 中增加 `maxDataRefreshPerDay`、`maxPublishPerDay` 并在 `quota.ts` 中映射。

---

## 四、文件变更摘要

- 新增：`web/src/app/api/comments/refresh/route.ts`
- 修改：`web/src/app/(dashboard)/comments/page.tsx`（刷新评论按钮与状态）
- 修改：`web/src/app/api/content/route.ts`（content_create 配额）
- 修改：`web/src/app/api/data/refresh/route.ts`（data_refresh 配额）
- 修改：`web/src/app/api/content/[id]/publish/route.ts`（publish 配额）
- 新增：`docs/GAP-AUDIT.md`（本文档）
