---
name: tool-fishaudio
description: "通过 Browser RPA 操作 Fish Audio 进行语音合成/TTS"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# Fish Audio RPA Skill

## 概述
通过浏览器自动化操作 Fish Audio (https://fish.audio)，完成高质量语音合成任务。
TTS-Arena 排行榜第 1，免费额度 8000 次/月，性价比极高。

## 前置条件
- Browser Profile `fishaudio` 已创建且已登录
- 工具在 tools.yaml 中 enabled: true

## 输入
- `text`: 要转换的文本内容
- `voice`: 声音模型选择
- `language`: 语言

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=fishaudio`，导航到 `https://fish.audio`。

### 2. 检查登录态
执行 `browser snapshot`。检查登录状态。
未登录 → 中断，通知 `/login fishaudio`。

### 3. 进入语音合成页面
导航到 Text to Speech 或语音合成功能页面。

### 4. 选择声音模型
- 浏览声音模型库
- 选择合适的声音（支持多语言）

### 5. 输入文本
在文本输入区域填入要合成的文本。

### 6. 生成语音
点击生成/合成按钮。

### 7. 等待生成完成
轮询策略：
- 每 5 秒执行一次 `browser snapshot`
- 超时：90 秒
- **进度反馈**：每 20 秒通知进度

### 8. 下载音频
- 点击下载按钮
- 保存到 `workspace/content/media/` 目录

### 9. 返回结果
返回生成的音频路径。

## 优势
- 免费额度充足（8,000 次/月）
- 语音质量领先（TTS-Arena 第 1）
- 支持多语言
- 支持声音克隆

## 异常处理
- 未登录 → 中断，提示 /login fishaudio
- 额度不足 → 通知创作者
- 生成失败 → 重试
