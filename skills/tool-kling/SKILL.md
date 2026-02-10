---
name: tool-kling
description: "通过 Browser RPA 操作可灵 AI 进行视频生成"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 可灵 AI (Kling) RPA Skill

## 概述
通过浏览器自动化操作可灵 AI (https://klingai.kuaishou.com)，完成 AI 视频生成任务。
快手出品，国内最强文生视频工具，支持最长 60 秒视频，Motion Brush 精确控制。

## 前置条件
- Browser Profile `kling` 已创建且已登录
- 工具在 tools.yaml 中 enabled: true

## 输入
- `prompt`: 视频描述提示词
- `duration`: 视频时长（5/10 秒，高级可选更长）
- `mode`: 生成模式（标准/专业）
- `reference_image`: 参考图片路径（可选，用于图生视频）
- `aspect_ratio`: 宽高比（16:9, 9:16, 1:1）

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=kling`，导航到 `https://klingai.kuaishou.com`。

### 2. 检查登录态
执行 `browser snapshot`。检查是否存在 "登录" 文本。
未登录 → 中断，通知 `/login kling`。

### 3. 选择生成模式
- 文生视频：选择「AI 视频」→「文生视频」
- 图生视频：选择「AI 视频」→「图生视频」，先上传参考图片

### 4. 填入提示词
在提示词输入区域填入视频描述。
可灵支持非常详细的运动描述。

### 5. 设置参数
- 选择时长
- 选择宽高比
- 选择生成模式（标准/专业）
- 如需使用 Motion Brush，进行区域绘制和运动方向设定

### 6. 发起生成
点击「生成」按钮。

### 7. 等待生成完成
轮询策略：
- 每 15 秒执行一次 `browser snapshot`
- 可灵生成时间较长（1-5 分钟）
- 超时：300 秒
- **进度反馈**：每 30 秒通知生成进度和队列位置

### 8. 预览和下载
- 生成完成后预览视频
- 点击下载按钮
- 保存到 `workspace/content/media/videos/`

### 9. 返回结果
返回生成的视频路径。

## 可灵特色功能
- Motion Brush：精确控制画面中特定区域的运动方向
- 视频续写：将短视频延长到 3 分钟
- 高级物理模拟：液体、布料等物理效果
- 音画同步（2.6 版本）

## 成本参考
- 标准模式约 0.7 元/秒（1080p）
- 专业模式成本更高

## 异常处理
- 未登录 → 中断，提示 /login kling
- 排队时间过长 → 通知创作者
- 额度不足 → 通知创作者充值
- 生成失败 → 通知并建议修改 prompt
