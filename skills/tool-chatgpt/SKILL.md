---
name: tool-chatgpt
description: "通过 Browser RPA 操作 ChatGPT Deep Thinking 进行文本创作"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# ChatGPT Deep Thinking RPA Skill

## 概述
通过浏览器自动化操作 ChatGPT (https://chat.openai.com)，利用其 Deep Thinking 能力完成深度文本创作。

## 前置条件
- Browser Profile `chatgpt` 已创建且已登录
- 工具在 tools.yaml 中 enabled: true

## 输入
- `prompt`: 要发送给 ChatGPT 的提示词
- `continue_conversation`: 是否在已有对话中继续（用于修改循环）

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=chatgpt`：
- 如果是新对话：导航到 `https://chat.openai.com`
- 如果是继续对话：使用当前已打开的页面

### 2. 检查登录态
执行 `browser snapshot`。
检查页面中是否存在 "Log in" 或 "Sign up" 文本。
如果存在 → 未登录，中断并通知：
```
ChatGPT 未登录，请执行 /login chatgpt 完成登录。
```

### 3. 开启新对话（如果需要）
如果是新创作（非继续对话）：
- 查找并点击 "New chat" 或 "+" 按钮开启新对话
- 等待页面就绪

### 4. 填入提示词
- 通过 `browser snapshot` 找到消息输入框（通常是 textarea 或 contenteditable div）
- 使用 `browser type` 或 `browser fill` 将提示词填入
- 注意：如果提示词很长，可能需要分批输入

### 5. 发送消息
- 查找并点击发送按钮（通常是一个箭头/发送图标按钮）
- 或者使用 `browser press Enter`（如果输入框支持）

### 6. 等待 Deep Thinking 完成
轮询策略：
- 每 5 秒执行一次 `browser snapshot`
- 检查以下完成标志：
  - ✅ 完成：出现新的回复内容块，且没有 "Stop generating" 按钮或加载动画
  - ⏳ 仍在生成：存在 "Stop generating" 按钮或跳动的光标/加载指示器
  - ❌ 超时：超过 180 秒仍未完成
- Deep Thinking 模式通常会先显示 "Thinking..." 阶段，然后开始输出文本

**进度反馈**（读取 `workspace/config/user-preferences.yaml` 的 `notifications.types.generation_progress`）：
- 30 秒后未完成 → 通知：「ChatGPT 正在思考中，请稍候...」
- 90 秒后未完成 → 通知：「ChatGPT 仍在生成，Deep Thinking 模式可能需要较长时间。输入 /cancel 可取消。」
- 150 秒后未完成 → 通知：「已等待 2.5 分钟，即将超时。」

### 7. 提取回复内容
生成完成后：
- `browser snapshot` 获取最新的回复内容
- 提取最后一条助手回复的完整文本
- 注意处理代码块、列表等格式化内容

### 8. 保存草稿
将结果保存到 `workspace/content/drafts/`：
```markdown
# ChatGPT 创作草稿

- 工具: ChatGPT Deep Thinking
- 时间: <时间戳>
- 类型: text

## 提示词
<prompt>

## 生成内容
<回复内容>
```

### 9. 返回结果
返回给 content-pipeline：
- `content`: 提取的文本内容
- `status`: success / timeout / auth_required / error
- `draft_path`: 草稿文件路径

## 修改循环
当创作者提出修改意见时：
1. 将修改意见构造为追加消息
2. 在同一 ChatGPT 对话中继续（设 `continue_conversation=true`）
3. 重复步骤 4-9

## 异常处理
- **未登录** → 中断，提示 /login chatgpt
- **生成超时 (>180s)** → 截图当前状态，通知创作者："ChatGPT 生成时间较长，请检查是否正常。"
- **页面错误** → 截图，通知创作者
- **网络问题** → 重试一次，仍失败则通知
