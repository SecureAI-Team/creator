---
name: publish-kuaishou
description: "通过 Browser RPA 将视频发布到快手"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 快手发布 RPA Skill

## 概述
通过浏览器自动化操作快手创作者平台 (https://cp.kuaishou.com)，完成视频发布。

> **参考**: social-auto-upload 项目 (dreammis/social-auto-upload) 中的 kuaishou 上传逻辑。

## 前置条件
- Browser Profile `kuaishou` 已创建且已登录
- 已有适配后的内容和视频文件

## 输入
- `title`: 标题（≤50 字）
- `description`: 视频描述（≤500 字）
- `tags`: 标签列表（≤10 个）
- `video_path`: 视频文件路径
- `cover_path`: 封面图路径（可选）

## RPA 操作步骤

### 1. Preflight 检查
profile=kuaishou，导航到快手创作者平台，检查登录态。
未登录 → 中断，提示 /login kuaishou。

### 2. 进入上传页面
导航到 `https://cp.kuaishou.com/article/publish/video`

### 3. 上传视频
- 找到视频上传区域（通常是拖拽上传区或文件选择按钮）
- 使用 `browser upload` 上传视频文件
- 等待上传和处理完成（轮询进度条）
- **进度反馈**：每 30 秒通知上传进度。超过 2 分钟 → 通知创作者。输入 /cancel 可取消。

### 4. 填写标题和描述
- 找到「作品描述」输入区域
- 填入标题和描述文案
- 快手标题和描述通常在同一个文本区域

### 5. 添加话题标签
- 点击「#话题」按钮或在描述中使用 #话题#
- 逐个输入并选择匹配的话题

### 6. 上传封面（可选）
- 如果提供了 `cover_path`，点击「更换封面」
- 上传自定义封面图

### 7. 设置可见性
- 默认选择「公开」
- 如需定时发布，选择「定时发布」并设置时间

### 8. 预览确认
截图 → 发送给创作者确认。

### 9. 发布
创作者确认后点击「发布」按钮，等待完成。

### 10. 验证 + 记录
检查成功提示，截图结果，写入发布日志。

## RPA 元素选择指南
> 参考: social-auto-upload 项目 (dreammis/social-auto-upload) 的 kuaishou uploader 逻辑

- 上传入口: `https://cp.kuaishou.com/article/publish/video`
- 视频上传：查找 `input[type="file"]` 元素，使用 `set_input_files`
- 描述区：通过 `placeholder`（如"添加作品描述"）定位编辑区
- 话题：在描述中输入 `#` 触发话题选择
- 封面更换：查找"更换封面"或封面编辑按钮
- 可见性设置：查找"公开/私密/好友可见"选项
- 定时发布：查找"定时发布"开关
- 发布按钮：通过 `role=button` + 文本"发布" 定位

**选择器优先级**: aria-label > placeholder > role > text content > 位置

## 异常处理
- 视频格式不支持 → 提示创作者转码
- 上传失败 → 重试一次，仍失败则通知
- 内容审核提示 → 截图通知
- 同城流量设置 → 根据用户偏好选择
- 元素定位失败 → 截图 + 通知，可能是页面改版
