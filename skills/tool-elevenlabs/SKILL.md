---
name: tool-elevenlabs
description: "通过 Browser RPA 操作 ElevenLabs 进行语音合成/TTS"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# ElevenLabs RPA Skill

## 概述
通过浏览器自动化操作 ElevenLabs (https://elevenlabs.io)，完成高质量语音合成（TTS）任务。
最逼真的多语言 TTS 工具，支持声音克隆，适合配音、播客、有声读物。

## 前置条件
- Browser Profile `elevenlabs` 已创建且已登录
- ElevenLabs 账号（免费版有额度限制）
- 工具在 tools.yaml 中 enabled: true

## 输入
- `text`: 要转换的文本内容
- `voice`: 声音选择（预设声音名或自定义声音 ID）
- `language`: 语言（zh-CN, en-US 等）
- `model`: 模型选择（Multilingual v2 推荐中文）
- `stability`: 稳定性参数（0-1）
- `clarity`: 清晰度参数（0-1）

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=elevenlabs`，导航到 `https://elevenlabs.io`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "Sign in" 文本。
未登录 → 中断，通知 `/login elevenlabs`。

### 3. 进入语音合成页面
导航到 Speech Synthesis 或 Text to Speech 页面。

### 4. 选择声音
- 从声音列表中选择目标声音
- 或使用自定义克隆的声音

### 5. 设置语言和模型
- 选择 Multilingual v2 模型（支持中文）
- 确认语言设置

### 6. 输入文本
在文本输入区域填入要合成的文本。
如果文本较长，可能需要分段。

### 7. 生成语音
点击「Generate」按钮。

### 8. 等待生成完成
轮询策略：
- 每 5 秒执行一次 `browser snapshot`
- 超时：120 秒
- **进度反馈**：每 20 秒通知进度

### 9. 试听和下载
- 播放生成的语音进行检查
- 点击下载按钮
- 保存到 `workspace/content/media/` 目录

### 10. 返回结果
返回生成的音频路径。

## 使用场景
- 视频配音/旁白
- 播客音频
- 文章有声版
- 多语言版本配音

## 异常处理
- 未登录 → 中断，提示 /login elevenlabs
- 额度不足 → 通知创作者（免费版每月约 10,000 字符）
- 文本过长 → 自动分段合成后拼接
- 生成质量差 → 建议调整 stability/clarity 参数
