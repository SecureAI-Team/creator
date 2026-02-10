---
name: tool-chanjing
description: "通过 Browser RPA 操作蝉镜 AI 进行数字人视频生成"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 蝉镜 AI RPA Skill

## 概述
通过浏览器自动化操作蝉镜 AI (https://www.chanjing.cc)，完成真人 2D 数字人口播视频生成。
国内数字人平台，中文口型同步效果好，适合国内自媒体口播场景。

## 前置条件
- Browser Profile `chanjing` 已创建且已登录
- 工具在 tools.yaml 中 enabled: true

## 输入
- `script`: 口播文本/脚本
- `avatar`: 数字人形象选择
- `voice`: 声音选择
- `background`: 背景选择（可选）

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=chanjing`，导航到 `https://www.chanjing.cc`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "登录" 文本。
未登录 → 中断，通知 `/login chanjing`。

### 3. 创建新项目
进入数字人视频创建页面。

### 4. 选择数字人形象
- 从形象库中选择真人 2D 数字人
- 国内常用：商务男/女、新闻主播风格等

### 5. 输入口播文本
- 在脚本输入区填入中文口播文本
- 选择配音声音
- 调整语速

### 6. 设置背景和字幕
- 选择背景
- 配置字幕样式（如需要）

### 7. 预览效果
- 预览生成效果
- 截图分享给创作者确认

### 8. 发起生成
创作者确认后提交生成。

### 9. 等待生成完成
轮询策略：
- 每 15 秒执行一次 `browser snapshot`
- 超时：300 秒
- **进度反馈**：每 30 秒通知进度

### 10. 下载视频
- 下载生成的视频
- 保存到 `workspace/content/media/videos/`

### 11. 返回结果
返回生成的视频路径。

## 优势
- 中文口型同步效果好
- 国内访问速度快
- 价格相对国外平台便宜

## 异常处理
- 未登录 → 中断，提示 /login chanjing
- 额度不足 → 通知创作者
- 生成失败 → 重试
