---
name: schedule-publish
description: "定时发布：安排内容在指定时间自动发布到指定平台"
user-invocable: true
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]},"always":true}}
---

# 定时发布

## 用途
当创作者执行 `/schedule <时间> <平台> <内容引用>` 时，创建一个 Cron Job 在指定时间自动执行发布。

## 操作步骤

### 1. 解析参数
- `时间`：支持格式如 "2026-02-11 08:00"、"明天早上8点"、"每周一9点"
- `平台`：目标平台列表
- `内容引用`：要发布的草稿或适配内容

### 2. 检查前置条件
- 确认对应平台已登录
- 确认内容已完成适配
- 如果未适配，先触发 content-adapt

### 3. 读取时区
从 `workspace/config/user-preferences.yaml` 读取 `timezone` 字段（默认 "Asia/Shanghai"）。

### 4. 创建 Cron Job
使用 OpenClaw cron 工具，`--tz` 参数使用用户配置的时区：

单次定时发布：
```bash
openclaw cron add \
  --name "定时发布 - <平台> - <标题摘要>" \
  --at "2026-02-11T08:00:00" \
  --tz "<用户时区>" \
  --session isolated \
  --message "执行定时发布：发布内容到 <平台>，内容路径 <path>。使用 publish-<platform> skill 执行。发布完成后汇总结果。" \
  --announce \
  --channel telegram \
  --to "<chat_id>"
```

周期性发布（如每周一）：
```bash
openclaw cron add \
  --name "周期发布 - <描述>" \
  --cron "0 9 * * 1" \
  --tz "<用户时区>" \
  --session isolated \
  --message "执行周期发布任务..." \
  --announce
```

### 5. 确认
通知创作者：
```
✅ 已安排定时发布：
- 时间: 2026-02-11 08:00 (<用户时区>)
- 平台: 公众号, 小红书
- 内容: <标题>

发布时我会通知你结果。
用 /cron list 查看所有定时任务。
```

### 6. 管理
- `/schedule list` — 查看所有定时发布任务
- `/schedule cancel <id>` — 取消定时发布
