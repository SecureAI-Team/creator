---
name: tool-jimeng
description: "通过 Browser RPA 操作即梦 AI 进行视频生成"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 即梦 AI RPA Skill

## 概述
通过浏览器自动化操作即梦 AI (https://jimeng.jianying.com)，完成 AI 视频生成任务。
字节跳动出品，与剪映生态集成，支持对口型、首尾帧等特色功能。

## 前置条件
- Browser Profile `jimeng` 已创建且已登录
- 工具在 tools.yaml 中 enabled: true

## 输入
- `prompt`: 视频描述提示词
- `duration`: 视频时长（3/6/9/12 秒可选）
- `reference_image`: 参考图片路径（可选）
- `aspect_ratio`: 宽高比

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=jimeng`，导航到 `https://jimeng.jianying.com`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "登录" 文本。
未登录 → 中断，通知 `/login jimeng`。

### 3. 选择功能
- 导航到「AI 视频」功能区
- 选择「文生视频」或「图生视频」

### 4. 填入提示词
在提示词输入区域填入视频描述。

### 5. 设置参数
- 选择时长（3/6/9/12 秒）
- 选择风格（写实/动漫/3D 等）
- 设置宽高比

### 6. 发起生成
点击「生成」按钮。

### 7. 等待生成完成
轮询策略：
- 每 10 秒执行一次 `browser snapshot`
- 超时：180 秒
- **进度反馈**：每 30 秒通知进度

### 8. 预览和下载
- 预览生成的视频
- 下载到 `workspace/content/media/videos/`

### 9. 返回结果
返回生成的视频路径。

## 即梦特色功能
- 对口型：让角色跟随音频说话
- 首尾帧：控制视频的起始和结束画面
- 与剪映集成：可直接在剪映中使用生成结果

## 异常处理
- 未登录 → 中断，提示 /login jimeng
- 额度不足 → 通知创作者
- 生成失败 → 重试或修改 prompt
