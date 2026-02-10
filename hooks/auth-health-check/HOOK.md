---
name: auth-health-check
description: "定期检查所有平台和 AI 工具的登录状态，过期时告警"
metadata: {"openclaw":{"emoji":"🔐","events":["gateway:startup"],"requires":{"config":["browser.enabled"]}}}
---

# Auth Health Check Hook

在 Gateway 启动时自动巡检所有已启用的平台和 AI 工具的登录状态。配合 Cron Job 实现每 4 小时定期巡检。

## 触发时机
- `gateway:startup`：Gateway 启动时
- Cron Job 定期触发系统事件时

## 检查逻辑

对每个已启用的平台和工具：

1. 读取 `workspace/config/platforms.yaml` 和 `workspace/config/tools.yaml`
2. 对每个条目：
   a. 启动对应的 Browser Profile
   b. 导航到其 `url`
   c. 执行 `browser snapshot`
   d. 检查 snapshot 中是否包含 `auth_check.indicator` 中的文本
   e. 如果包含 → 未登录状态
   f. 如果不包含 → 已登录状态
3. 更新 `workspace/auth/<profile>.md` 状态文件
4. 如果有任何平台/工具从「已登录」变为「未登录」，发送告警消息

## 告警消息格式

```
⚠️ 登录状态告警

以下平台/工具的登录已过期：
- 小红书：请执行 /login xiaohongshu
- ChatGPT：请执行 /login chatgpt

请尽快重新登录以确保正常使用。
```

## 配合 Cron 使用

建议创建以下 Cron Job 实现定期巡检：

```bash
openclaw cron add \
  --name "登录态巡检" \
  --cron "0 */4 * * *" \
  --tz "<用户时区，见 workspace/config/user-preferences.yaml>" \
  --session isolated \
  --message "执行登录态巡检：检查所有已启用平台和工具的登录状态，将结果汇总报告。如有过期，列出需要重新登录的列表。" \
  --announce \
  --channel telegram \
  --to "<chat_id>"
```
