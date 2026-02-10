---
name: tool-runway
description: "通过 Browser RPA 操作 Runway 进行视频生成"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# Runway RPA Skill

## 概述
通过浏览器自动化操作 Runway (https://app.runwayml.com)，完成 AI 视频生成任务。
老牌综合最优文生视频/图生视频工具，画面质量高。

## 前置条件
- Browser Profile `runway` 已创建且已登录
- Runway 订阅账号
- 工具在 tools.yaml 中 enabled: true

## 输入
- `prompt`: 视频描述提示词
- `reference_image`: 参考图片路径（可选，图生视频）
- `duration`: 视频时长（4/8/16 秒）
- `aspect_ratio`: 宽高比

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=runway`，导航到 `https://app.runwayml.com`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "Sign in" 文本。
未登录 → 中断，通知 `/login runway`。

### 3. 选择工具
- 导航到 Gen-3 Alpha / Gen-4 视频生成工具
- 选择「Text to Video」或「Image to Video」

### 4. 填入提示词
在提示词输入区域填入视频描述。
如有参考图片，先上传参考图。

### 5. 设置参数
- 选择视频时长
- 选择分辨率和宽高比
- 设置其他高级选项（Motion, Camera 等）

### 6. 发起生成
点击「Generate」按钮。

### 7. 等待生成完成
轮询策略：
- 每 10 秒执行一次 `browser snapshot`
- 超时：180 秒
- **进度反馈**：每 30 秒通知进度

### 8. 预览和下载
- 预览生成的视频
- 点击下载
- 保存到 `workspace/content/media/videos/`

### 9. 返回结果
返回生成的视频路径。

## 异常处理
- 未登录 → 中断，提示 /login runway
- 信用不足 → 通知创作者
- 生成失败 → 重试或修改 prompt
