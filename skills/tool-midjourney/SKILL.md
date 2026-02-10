---
name: tool-midjourney
description: "通过 Browser RPA 操作 Midjourney 进行图片生成"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# Midjourney RPA Skill

## 概述
通过浏览器自动化操作 Midjourney Web (https://www.midjourney.com)，完成图片生成任务。
适用于封面图、配图、海报、缩略图等自媒体视觉素材生成。

## 前置条件
- Browser Profile `midjourney` 已创建且已登录
- 工具在 tools.yaml 中 enabled: true
- 需要 Midjourney 订阅账号

## 输入
- `prompt`: 图片生成提示词（英文效果最佳）
- `aspect_ratio`: 宽高比（如 "16:9", "1:1", "9:16", "3:4"）
- `style`: 风格参数（如 "--style raw", "--niji"）
- `count`: 生成数量（默认 4 张）

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=midjourney`，导航到 `https://www.midjourney.com`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "Sign In" 文本。
未登录 → 中断，通知 `/login midjourney`。

### 3. 进入创建页面
导航到创建/生成页面（Explore 或 Create 入口）。

### 4. 填入提示词
找到提示词输入框，填入完整的 prompt。
自动附加参数：`--ar {aspect_ratio}` 等。

### 5. 发送生成请求
按 Enter 或点击发送按钮。

### 6. 等待生成完成
轮询策略：
- 每 10 秒执行一次 `browser snapshot`
- 完成标志：图片网格出现，无加载动画
- 超时：120 秒
- **进度反馈**：每 30 秒通知生成进度

### 7. 提取生成结果
- 从页面中识别生成的图片
- 选择最佳图片（或让创作者选择）
- 点击 Upscale (U1-U4) 放大选中的图片

### 8. 下载图片
- 等待放大完成
- 右键保存或点击下载按钮
- 保存到 `workspace/content/media/images/`

### 9. 返回结果
返回生成的图片路径，供后续封面/配图使用。

## 平台封面尺寸参考
- 小红书封面: 3:4 (1000x1333) 或 1:1
- 抖音封面: 9:16 (1080x1920)
- B站封面: 16:9 (1920x1080)
- YouTube 缩略图: 16:9 (1280x720)
- 微信公众号封面: 2.35:1 (900x383)
- 头条号封面: 16:9

## 异常处理
- 未登录 → 中断，提示 /login midjourney
- 生成失败（内容策略限制）→ 通知创作者修改 prompt
- 额度不足 → 通知创作者
- 生成超时 → 截图 + 通知
