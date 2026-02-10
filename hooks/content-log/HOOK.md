---
name: content-log
description: "记录每次 AI 工具创作的输入输出到 Workspace"
metadata: {"openclaw":{"emoji":"✏️","events":["command:new"]}}
---

# Content Log Hook

记录每次通过 AI 工具（ChatGPT、NotebookLM 等）创作的输入提示词和输出结果。
方便创作者回顾和复用优秀的提示词。

## 日志位置

`workspace/content/drafts/YYYY-MM-DD-<tool>-<slug>.md`

## 日志格式

```markdown
# 创作记录

- 工具: ChatGPT Deep Thinking
- 时间: 2026-02-10 14:00:00
- 类型: text

## 提示词
<发送给工具的完整提示词>

## 生成结果
<工具返回的完整内容>

## 创作者修改意见
<如有修改循环，记录每轮修改>
```
