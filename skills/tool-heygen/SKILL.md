---
name: tool-heygen
description: "通过 Browser RPA 操作 HeyGen 进行数字人视频生成"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# HeyGen RPA Skill

## 概述
通过浏览器自动化操作 HeyGen (https://app.heygen.com)，完成 AI 数字人视频生成任务。
支持多语言口型同步，适合口播类视频、产品介绍、教学视频。

## 前置条件
- Browser Profile `heygen` 已创建且已登录
- HeyGen 订阅账号
- 工具在 tools.yaml 中 enabled: true

## 输入
- `script`: 口播文本/脚本
- `avatar`: 数字人形象选择（预设或自定义）
- `language`: 语言（zh-CN, en-US 等）
- `voice`: 声音选择
- `background`: 背景选择（可选）
- `aspect_ratio`: 宽高比（16:9, 9:16）

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=heygen`，导航到 `https://app.heygen.com`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "Sign in" 文本。
未登录 → 中断，通知 `/login heygen`。

### 3. 创建新视频
点击「Create Video」或类似按钮。

### 4. 选择数字人
- 从数字人库中选择形象
- 或使用用户自定义的数字人克隆

### 5. 设置脚本
- 在脚本输入区填入口播文本
- 选择语言和声音
- 设置语速和情绪

### 6. 设置背景
- 选择纯色/图片/视频背景
- 或上传自定义背景

### 7. 预览
- 点击预览按钮查看效果
- 截图发送给创作者确认

### 8. 发起生成
创作者确认后点击「Generate」/「Submit」按钮。

### 9. 等待生成完成
轮询策略：
- 每 15 秒执行一次 `browser snapshot`
- 数字人视频生成时间较长
- 超时：300 秒
- **进度反馈**：每 30 秒通知进度

### 10. 下载视频
- 生成完成后下载视频
- 保存到 `workspace/content/media/videos/`

### 11. 返回结果
返回生成的视频路径。

## 使用场景
- 口播类短视频（抖音、快手、视频号）
- 产品介绍视频
- 教学/知识科普视频
- 多语言版本口播

## 异常处理
- 未登录 → 中断，提示 /login heygen
- 信用不足 → 通知创作者
- 生成失败 → 通知并建议简化脚本
- 口型不同步 → 建议调整语速
