---
name: auth-status
description: "查看所有平台和 AI 工具的登录状态"
user-invocable: true
metadata: {"openclaw":{"always":true}}
---

# 登录状态查询

## 用途
当创作者执行 `/auth` 时，显示所有平台和工具的登录状态概览。

## 操作步骤

### 1. 收集状态
读取 `workspace/auth/` 目录下的所有状态文件。

### 2. 加载注册表
- 读取 `workspace/config/platforms.yaml` 获取所有平台
- 读取 `workspace/config/tools.yaml` 获取所有已启用的工具

### 3. 汇总展示
按「发布平台」和「AI 工具」分组展示：

```
📋 登录状态总览

发布平台：
  ✅ 哔哩哔哩 — 已登录（上次检查: 2小时前）
  ✅ 小红书 — 已登录（上次检查: 2小时前）
  ❌ 微信公众号 — 未登录
  ❌ 微信视频号 — 未登录
  ✅ 抖音 — 已登录（上次检查: 2小时前）
  ✅ YouTube — 已登录（上次检查: 2小时前）

AI 创作工具：
  ✅ ChatGPT — 已登录（上次检查: 2小时前）
  ✅ NotebookLM — 已登录（上次检查: 2小时前）

下次自动巡检: 4小时后
需要登录？执行 /login <名称>
```

### 4. 主动提醒
如果有任何平台或工具未登录，在消息末尾高亮提醒。
