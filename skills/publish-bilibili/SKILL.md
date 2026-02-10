---
name: publish-bilibili
description: "通过 Browser RPA 将视频/图文投稿到 B站"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# B站投稿 RPA Skill

## 概述
通过浏览器自动化操作 B站创作中心 (https://member.bilibili.com)，完成视频或图文投稿。

## 前置条件
- Browser Profile `bilibili` 已创建且已登录
- 已有适配后的内容

## 输入
- `title`: 标题（≤80 字）
- `description`: 视频描述/简介（≤2000 字）
- `tags`: 标签列表（≤12 个）
- `video_path`: 视频文件路径（视频类）
- `cover_path`: 封面图路径（可选）
- `content_type`: "video" 或 "text"（专栏）

## RPA 操作步骤

### 1. Preflight 检查
profile=bilibili，导航到 B站创作中心，检查登录态。
未登录 → 中断，提示 /login bilibili。

### 2. 进入投稿页面
- 视频：导航到 `https://member.bilibili.com/platform/upload/video/frame`
- 专栏：导航到 `https://member.bilibili.com/platform/upload/text/edit`

### 3. 上传视频/编写专栏
视频投稿：
- 找到视频上传区域，使用 `browser upload` 上传视频
- 等待上传和转码完成（轮询检查进度）
- **进度反馈**：每 30 秒通知上传/转码进度（如有进度条则提取百分比）
- 超过 2 分钟未完成 → 通知：「视频上传中，请稍候...输入 /cancel 可取消。」

专栏投稿：
- 在编辑器中填入正文内容

### 4. 填写标题和描述
- 填入标题（≤80 字）
- 填入视频描述或专栏摘要

### 5. 添加标签
- 找到标签输入区域
- 逐个输入标签并确认

### 6. 选择分区
- 根据内容类型选择合适的分区
- 通过 snapshot 识别分区选项

### 7. 预览确认
截图发布预览 → 发送给创作者等待确认。

### 8. 提交投稿
创作者确认后点击「投稿」按钮，等待提交完成。

### 9. 验证 + 记录
检查成功提示，截图结果，写入发布日志。

## RPA 元素选择指南
> 参考: social-auto-upload 项目 (dreammis/social-auto-upload) 的 bilibili uploader 逻辑

- 视频上传：查找 `input[type="file"]` 或拖拽上传区域，使用 `set_input_files`
- 标题输入：通过 `placeholder` 属性（如"请输入标题"）定位
- 描述输入：通过 `placeholder` 或 `role=textbox` 定位
- 标签输入：标签区域通常有明确的 `placeholder`（如"按回车键Enter创建标签"）
- 分区选择：通过下拉菜单 role 定位
- 转码进度：查找进度条元素或百分比文本
- 发布按钮：通过 `role=button` + 文本"投稿"定位

**选择器优先级**: aria-label > placeholder > role > text content > 位置

## 异常处理
- 视频上传/转码耗时长 → 定期通知进度
- 分区选择不当 → 使用「生活」等通用分区
- 审核提示 → 截图通知
- 元素定位失败 → 截图 + 通知创作者，可能是页面改版
