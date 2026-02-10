---
name: publish-youtube
description: "通过 Browser RPA 将视频上传到 YouTube"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# YouTube 发布 RPA Skill

## 概述
通过浏览器自动化操作 YouTube Studio (https://studio.youtube.com)，完成视频上传和发布。

## 前置条件
- Browser Profile `youtube` 已创建且已登录（Google 账号）
- 已有适配后的内容和视频文件

## 输入
- `title`: 标题（≤100 字）
- `description`: 视频描述（≤5000 字，含时间戳等）
- `tags`: 标签/关键词列表
- `video_path`: 视频文件路径
- `visibility`: "public" / "unlisted" / "private"（默认 public）

## RPA 操作步骤

### 1. Preflight 检查
profile=youtube，导航到 YouTube Studio，检查登录态。
未登录 → 中断，提示 /login youtube。

### 2. 点击上传
- 在 YouTube Studio 中找到「上传视频」按钮（通常在右上角的「创建」图标）
- 点击「上传视频」

### 3. 上传视频文件
- 使用 `browser upload` 选择视频文件
- 等待上传完成（YouTube 上传可能较慢，轮询检查进度）
- **进度反馈**：每 30 秒通知上传进度（YouTube 通常显示百分比）
- 超过 2 分钟未完成 → 通知：「YouTube 视频上传中（可能较慢），请稍候...」
- 超过 5 分钟 → 通知：「上传仍在进行，大文件可能需要更长时间。输入 /cancel 可取消。」

### 4. 填写详情
- 填入标题
- 填入描述（含 timestamps 如有）
- 选择缩略图（可从自动生成中选取）

### 5. 设置标签
- 展开「更多选项」
- 填入标签关键词

### 6. 选择可见性
- 在「可见性」步骤选择：公开/不公开/私享

### 7. 预览确认
截图 → 发送给创作者确认。

### 8. 发布
创作者确认后点击「发布」。

### 9. 验证 + 记录
检查成功提示，获取视频链接，截图结果，写入发布日志。

## 异常处理
- 上传超时 → 定期通知进度
- 版权检测 → 截图通知创作者
