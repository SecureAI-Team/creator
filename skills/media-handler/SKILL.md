---
name: media-handler
description: "处理创作者通过聊天发送的图片、视频、文件"
user-invocable: false
metadata: {"openclaw":{"always":true}}
---

# 媒体文件处理

## 用途
当创作者通过 Telegram/WeChat 发送图片、视频或文件时，自动接收并保存到 Workspace，
可关联到当前草稿或留作发布时使用。

## 触发方式
此 Skill 不通过 Slash Command 触发，而是由 Agent 在检测到用户发送媒体文件时自动调用。

## 操作步骤

### 1. 接收文件
当创作者发送图片/视频/文件时：
- 识别文件类型（image / video / document）
- 获取文件名和大小

### 2. 保存到 Workspace
将文件保存到对应目录：
- 图片 → `workspace/content/media/images/YYYY-MM-DD-<原始文件名>`
- 视频 → `workspace/content/media/videos/YYYY-MM-DD-<原始文件名>`
- 文档 → `workspace/content/media/docs/YYYY-MM-DD-<原始文件名>`

### 3. 关联到上下文
判断当前上下文：

**有正在编辑的草稿**：
```
已收到图片 <文件名>，已保存。
要将它作为当前草稿「<标题>」的配图/封面吗？
```

**没有活跃草稿**：
```
已收到并保存 <文件名>。
路径: workspace/content/media/images/<文件名>
发布时可以用它作为配图。
```

**在发布流程中**：
```
已收到图片 <文件名>，将作为本次发布的封面/配图使用。
```

### 4. 图片预处理（可选）
对于图片文件，可以用 Qwen 描述图片内容，方便后续使用：
```
图片内容：<AI 描述>
建议用途：封面图 / 文章配图 / 小红书首图
```

## 支持的格式
- 图片：jpg, jpeg, png, gif, webp
- 视频：mp4, mov, avi, mkv
- 文档：pdf, doc, docx, txt, md

## 注意事项
- 大文件（>100MB）提示创作者通过其他方式上传
- 保存后在 Telegram 回复确认，不要静默处理
- 文件命名加日期前缀，避免覆盖
