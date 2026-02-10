---
name: tool-claude
description: "通过 Browser RPA 操作 Claude 进行文本创作"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# Claude RPA Skill

## 概述
通过浏览器自动化操作 Claude (https://claude.ai)，完成文本创作任务。

## 前置条件
- Browser Profile `claude` 已创建且已登录
- 工具在 tools.yaml 中 enabled: true

## 输入
- `prompt`: 要发送给 Claude 的提示词
- `continue_conversation`: 是否在已有对话中继续

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=claude`，导航到 `https://claude.ai`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "Sign in" 文本。
未登录 → 中断，通知 `/login claude`。

### 3. 开启新对话
如果是新创作：点击 "New chat" 或 "Start a new conversation" 开启新对话。

### 4. 填入提示词
通过 `browser snapshot` 找到消息输入框，使用 `browser fill` 填入提示词。

### 5. 发送消息
点击发送按钮或按 Enter。

### 6. 等待生成完成
轮询策略：
- 每 5 秒执行一次 `browser snapshot`
- 完成标志：回复内容完整且无加载指示器（如 "Stop" 按钮消失）
- 超时：180 秒

### 7. 提取回复内容
snapshot 提取最新助手回复的完整文本。

### 8. 保存草稿
保存到 `workspace/content/drafts/`，返回结果给调用方。

## 异常处理
- 未登录 → 中断，提示 /login claude
- 生成超时 → 截图 + 通知创作者
- 页面异常 → 截图 + 通知
