---
name: help
description: "显示所有可用指令和使用说明"
user-invocable: true
metadata: {"openclaw":{"always":true}}
---

# 帮助中心

## 用途
当创作者执行 `/help` 或 `/start` 时，展示所有可用指令和基本使用说明。
首次对话时也应主动展示。

## 操作步骤

### 1. 展示欢迎 + 指令列表

```
👋 你好！我是你的自媒体创作助手。

我可以帮你完成从选题、创作到多平台发布的全流程。你可以用自然语言和我对话，也可以用下面的快捷指令。

📝 创作类
  /topic [领域]           — 推荐选题方向
  /trending [平台]        — 查看各平台热搜/热点
  /write [--tool 名] 选题  — 文本创作
  /video [--tool 名] 选题  — 视频创作
  /cover <描述>           — 生成封面图/缩略图
  /drafts                 — 查看草稿列表

📤 发布类
  /publish 平台            — 发布到指定平台（支持多个）
  /schedule 时间 平台       — 定时发布

📊 数据类
  /data [平台]             — 查看最新数据
  /data trend             — 近 7 天趋势
  /comments [平台]         — 查看评论 + 智能回复

🔧 管理类
  /tools                  — 查看/管理 AI 创作工具
  /login 名称              — 登录平台或工具
  /auth                   — 查看所有登录状态
  /settings               — 修改偏好设置
  /cancel                 — 取消当前操作

❓ 其他
  /help                   — 显示本帮助
  /start                  — 首次使用引导
  /vnc                    — 远程操作指南

📋 支持平台（10个）
  B站、小红书、公众号、视频号、抖音、YouTube
  快手、知乎、微博、头条号

🎨 支持工具（20+）
  文本: ChatGPT, Claude, DeepSeek, Gemini, Kimi, 通义千问
  视频: NotebookLM, 可灵, 即梦, Sora, Runway
  图片: DALL-E, Midjourney, 通义万相
  音频: Suno, ElevenLabs, Fish Audio
  数字人: HeyGen, 蝉镜

💡 你也可以直接说：
  「帮我写一篇关于 AI 的文章」
  「做一个量子计算的视频」
  「今天有什么热点？」
  「帮我做一张小红书封面」
  「发到小红书和公众号」
  「最近数据怎么样」
  「看看评论」
```

### 2. 根据上下文提供提示
如果检测到用户可能是新用户（workspace/auth/ 下没有登录记录），追加：

```
看起来你还没有登录任何平台，建议先执行 /start 完成初始化设置。
```

### 3. 详细帮助
如果用户执行 `/help <指令名>`，展示该指令的详细用法和示例。

例如 `/help write`：
```
📝 /write 用法

基本用法:
  /write AI 对教育的影响

指定工具:
  /write --tool claude 量子计算入门

参数:
  --tool <名>  指定创作工具（默认使用 tools.yaml 中的默认文本工具）

流程:
  1. 选择 AI 工具 → 2. 构造提示词 → 3. RPA 生成 → 4. 你审核
  5. 满意后可直接说「发布」进入发布流程

示例对话:
  你: /write AI 在医疗领域的应用
  助手: 正在用 ChatGPT 生成... [完成后展示内容]
  你: 第二段加一些数据支持
  助手: 已修改... [展示更新后的内容]
  你: 可以，发到公众号
```
