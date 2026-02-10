---
name: tool-kimi
description: "通过 Browser RPA 操作 Kimi (Moonshot) 进行文本创作"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# Kimi RPA Skill

## 概述
通过浏览器自动化操作 Kimi (https://kimi.moonshot.cn)，完成文本创作任务。

## 前置条件
- Browser Profile `kimi` 已创建且已登录
- 工具在 tools.yaml 中 enabled: true

## 输入
- `prompt`: 要发送给 Kimi 的提示词
- `continue_conversation`: 是否在已有对话中继续

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=kimi`，导航到 `https://kimi.moonshot.cn`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "登录" 文本。
未登录 → 中断，通知 `/login kimi`。

### 3. 开启新对话
如果是新创作：查找并点击新建对话按钮。

### 4. 填入提示词
找到消息输入框，使用 `browser fill` 填入提示词。

### 5. 发送消息
点击发送按钮。

### 6. 等待生成完成
轮询策略：
- 每 5 秒执行一次 `browser snapshot`
- 完成标志：回复完整，无加载动画
- Kimi 擅长长文本，可能生成时间较长
- 超时：300 秒

### 7. 提取回复内容
snapshot 提取最新回复文本。

### 8. 保存草稿
保存到 `workspace/content/drafts/`，返回结果。

## 异常处理
- 未登录 → 中断，提示 /login kimi
- 生成超时 → 截图 + 通知
- 页面异常 → 截图 + 通知
