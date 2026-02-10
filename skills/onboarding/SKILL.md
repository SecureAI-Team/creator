---
name: onboarding
description: "首次使用引导：检查环境、引导登录、配置工具"
user-invocable: true
metadata: {"openclaw":{"always":true}}
---

# 首次使用引导

## 用途
当创作者执行 `/start` 或首次与助手对话时，执行交互式引导完成初始化设置。

## 引导流程

### 步骤 1：欢迎 + 环境检查

```
🎉 欢迎使用自媒体创作助手！

我来帮你完成初始设置，整个过程大约 5-10 分钟。

正在检查环境...
```

检查项：
1. ✅ OpenClaw Gateway 运行正常
2. ✅/❌ DashScope API Key 是否配置（检查 env 变量）
3. ✅/❌ Browser 是否可用（尝试启动一个 browser 实例）

如果有检查项失败，给出修复指引后暂停。

### 步骤 2：了解创作者

```
先了解一下你的情况：

1️⃣ 你主要运营哪些平台？
   a) B站  b) 小红书  c) 公众号  d) 视频号  e) 抖音  f) YouTube
   （可多选，用空格分隔，如: a b c）

2️⃣ 你的内容主要是什么类型？
   a) 图文为主  b) 视频为主  c) 图文+视频都有

3️⃣ 你的创作领域是什么？（如：科技、教育、生活...）
```

记录到 `workspace/config/user-preferences.yaml` 的 creation 段。

### 步骤 3：登录平台

根据创作者选择的平台，逐个引导登录：

```
接下来需要登录你选择的平台。我会打开浏览器，你通过 VNC 完成手动登录。

📱 第 1 个：小红书
   请执行以下步骤：
   1. 我正在打开小红书创作者后台...
   2. 请通过 VNC (http://<IP>:6080/vnc.html) 访问浏览器
   3. 完成扫码或账号密码登录
   4. 登录完成后告诉我

（如果你还不了解 VNC 操作，说「VNC 怎么用」我会详细指导）
```

每个平台登录完成后验证，然后继续下一个。

### 步骤 4：配置 AI 工具

```
现在配置 AI 创作工具。

当前已启用：
  ✅ ChatGPT Deep Thinking（文本默认）
  ✅ NotebookLM Studio（视频默认）

你还想启用其他工具吗？
  a) Claude  b) DeepSeek  c) Gemini  d) Kimi  e) 通义千问 Web
  f) 暂时不需要

（启用后需要登录对应工具的网站）
```

如果选择了额外工具，执行 `/tools enable` + `/login`。

### 步骤 5：测试一下

```
🎉 设置完成！来测试一下吧。

试着对我说以下任何一句：
  • 「帮我想几个选题」
  • 「写一篇关于 XX 的文章」
  • 「看看最近数据」
  • 或任何你想做的事

随时输入 /help 查看所有指令。祝创作愉快！
```

### 步骤 6：保存设置状态

将 onboarding 完成状态写入 `workspace/config/user-preferences.yaml`：
```yaml
onboarding:
  completed: true
  completed_at: "2026-02-10T14:30:00Z"
  platforms_configured: [xiaohongshu, weixin-mp, bilibili]
  tools_configured: [chatgpt, notebooklm]
```

## 注意事项
- 如果创作者中途退出，下次执行 `/start` 时从断点继续
- 登录步骤可以跳过（说「跳过」或「稍后登录」）
- 整个引导应保持对话式、友好、不催促
