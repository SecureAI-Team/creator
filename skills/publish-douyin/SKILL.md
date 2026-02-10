---
name: publish-douyin
description: "通过 Browser RPA 将视频发布到抖音"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 抖音发布 RPA Skill

## 概述
通过浏览器自动化操作抖音创作者平台 (https://creator.douyin.com)，完成视频发布。

## 前置条件
- Browser Profile `douyin` 已创建且已登录
- 已有适配后的内容和视频文件

## 输入
- `title`: 标题（≤55 字）
- `description`: 视频描述（≤4000 字）
- `tags`: 标签列表（≤5 个）
- `video_path`: 视频文件路径

## RPA 操作步骤

### 1. Preflight 检查
profile=douyin，导航到抖音创作者平台，检查登录态。
未登录 → 中断，提示 /login douyin。

### 2. 进入上传页面
导航到 `https://creator.douyin.com/creator-micro/content/upload`

### 3. 上传视频
- 找到视频上传区域
- 使用 `browser upload` 上传视频文件
- 等待上传和处理完成
- **进度反馈**：每 30 秒通知上传进度。超过 2 分钟 → 通知创作者。输入 /cancel 可取消。

### 4. 填写标题和描述
- 填入作品标题（≤55 字）
- 填入作品描述/文案

### 5. 添加话题标签
- 在描述区域或标签区域添加 #话题#

### 6. 选择封面
- 可从视频中选取封面帧
- 或提示创作者手动选择

### 7. 预览确认
截图 → 发送给创作者确认。

### 8. 发布
创作者确认后点击「发布」，等待完成。

### 9. 验证 + 记录
检查成功提示，截图结果，写入发布日志。

## RPA 元素选择指南
> 参考: social-auto-upload 项目 (dreammis/social-auto-upload) 的 douyin uploader 逻辑

- 视频上传：查找 `input[type="file"]` 元素，使用 `set_input_files`
- 标题/描述：编辑区通常是 `contenteditable` 的 div，通过 snapshot 定位
- 话题标签：在编辑区输入 `#话题#` 格式，触发话题搜索浮层
- 封面选择：点击封面区域 → 从视频帧中选取或上传自定义
- 定时发布：找到「定时发布」开关/选项，设置时间（社交自动化参考了"第二天"的时间逻辑）
- 发布按钮：页面底部通过 `role=button` + 文本"发布" 定位

**选择器优先级**: aria-label > placeholder > role > text content > 位置

## 异常处理
- 视频格式不支持 → 提示创作者转码
- 内容审核 → 截图通知
- 元素定位失败 → 截图 + 通知，可能是页面改版
