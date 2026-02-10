---
name: tool-suno
description: "通过 Browser RPA 操作 Suno AI 进行音乐/音频生成"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# Suno AI RPA Skill

## 概述
通过浏览器自动化操作 Suno AI (https://suno.com)，完成音乐和音频生成任务。
适用于背景音乐、片头曲、主题曲等自媒体音频素材生成。

## 前置条件
- Browser Profile `suno` 已创建且已登录
- 工具在 tools.yaml 中 enabled: true

## 输入
- `prompt`: 音乐描述（风格、情绪、节奏等）
- `lyrics`: 歌词文本（可选，自定义歌词模式）
- `instrumental`: 是否纯器乐（无人声）
- `duration`: 目标时长

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=suno`，导航到 `https://suno.com`。

### 2. 检查登录态
执行 `browser snapshot`。检查登录状态。
未登录 → 中断，通知 `/login suno`。

### 3. 进入创建页面
导航到创建/生成页面。

### 4. 选择生成模式
- 描述模式：输入音乐风格和情绪描述
- 自定义模式：输入歌词和风格标签

### 5. 填入内容
- 描述模式：填入音乐描述 prompt
- 自定义模式：填入歌词文本，设置风格标签
- 如果选择纯器乐，勾选 Instrumental

### 6. 发起生成
点击「Create」按钮。

### 7. 等待生成完成
轮询策略：
- 每 10 秒执行一次 `browser snapshot`
- 超时：120 秒
- **进度反馈**：每 20 秒通知进度

### 8. 试听和选择
- 生成完成后试听（通常生成 2 首）
- 截图分享给创作者，让其选择

### 9. 下载音频
- 点击下载按钮
- 保存到 `workspace/content/media/` 目录

### 10. 返回结果
返回生成的音频路径。

## 异常处理
- 未登录 → 中断，提示 /login suno
- 额度不足 → 通知创作者
- 生成失败 → 重试
