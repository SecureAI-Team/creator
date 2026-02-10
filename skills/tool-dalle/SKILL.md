---
name: tool-dalle
description: "通过 Browser RPA 操作 ChatGPT 的 DALL-E 进行图片生成"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# DALL-E (via ChatGPT) RPA Skill

## 概述
通过浏览器自动化操作 ChatGPT (https://chat.openai.com) 中的 DALL-E 图片生成功能。
复用 ChatGPT 的 Browser Profile，无需单独登录。

## 前置条件
- Browser Profile `chatgpt` 已创建且已登录
- ChatGPT Plus/Team 订阅（DALL-E 需要付费版）
- 工具在 tools.yaml 中 enabled: true

## 输入
- `prompt`: 图片描述提示词
- `style`: 风格偏好（"natural" | "vivid"）
- `size`: 尺寸（"1024x1024" | "1792x1024" | "1024x1792"）

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=chatgpt`，导航到 `https://chat.openai.com`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "Log in" 文本。
未登录 → 中断，通知 `/login chatgpt`。

### 3. 开启新对话
点击 "New chat" 开启新对话。

### 4. 发送图片生成请求
在输入框中填入生成指令，例如：
```
请为我生成一张图片：{prompt}
尺寸：{size}
风格：{style}
```

### 5. 等待生成完成
轮询策略：
- 每 10 秒执行一次 `browser snapshot`
- 完成标志：图片在对话中出现
- 超时：90 秒
- **进度反馈**：每 30 秒通知进度

### 6. 下载图片
- 找到生成的图片元素
- 点击图片打开预览
- 点击下载按钮保存
- 保存到 `workspace/content/media/images/`

### 7. 返回结果
返回生成的图片路径。

## 优势
- 复用 ChatGPT Profile，无需额外登录
- 支持中文描述，ChatGPT 会自动优化为 DALL-E 提示词
- 可以在对话中迭代修改

## 异常处理
- 未登录 → 中断，提示 /login chatgpt
- 生成被拒绝（内容策略）→ 通知创作者修改描述
- 额度不足 → 通知创作者
