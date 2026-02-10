---
name: tool-sora
description: "通过 Browser RPA 操作 Sora 进行视频生成"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# Sora (OpenAI) RPA Skill

## 概述
通过浏览器自动化操作 Sora (https://sora.com)，完成 AI 视频生成任务。
OpenAI 出品，支持 15-25 秒高质量视频，内置音频生成。

## 前置条件
- Browser Profile `sora` 已创建且已登录
- 需要 ChatGPT Plus/Pro 订阅
- 工具在 tools.yaml 中 enabled: true

## 输入
- `prompt`: 视频描述提示词
- `duration`: 视频时长（最长 15-25 秒）
- `resolution`: 分辨率（480p/720p/1080p）
- `aspect_ratio`: 宽高比（16:9, 9:16, 1:1）

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=sora`，导航到 `https://sora.com`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "Log in" 文本。
未登录 → 中断，通知 `/login sora`。

### 3. 创建新视频
进入创建/生成页面。

### 4. 填入提示词
在提示词输入区域填入视频描述。

### 5. 设置参数
- 选择时长
- 选择分辨率
- 选择宽高比

### 6. 发起生成
点击生成按钮。

### 7. 等待生成完成
轮询策略：
- 每 15 秒执行一次 `browser snapshot`
- Sora 生成时间较长
- 超时：300 秒
- **进度反馈**：每 30 秒通知进度

### 8. 预览和下载
- 预览生成的视频
- 下载到 `workspace/content/media/videos/`

### 9. 返回结果
返回生成的视频路径。

## Sora 特色功能
- 内置音频生成（音效、环境音）
- 角色客串/一致性
- 高质量 1080p 输出
- 适合社交媒体短视频

## 异常处理
- 未登录 → 中断，提示 /login sora
- 内容策略限制 → 通知修改 prompt
- 额度不足 → 通知创作者
- 排队等待 → 通知预计时间
