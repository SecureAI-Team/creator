---
name: multi-publish
description: "将内容并行发布到多个平台，使用 Sub-Agent 实现并行"
user-invocable: true
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]},"always":true}}
---

# 多平台并行发布

## 用途
当创作者执行 `/publish <平台列表>` 或说「发到多个平台」时，编排多平台并行发布流程。

## 操作步骤

### 1. 解析目标平台
从用户输入中提取目标平台列表。支持：
- 平台名：bilibili, xiaohongshu, weixin-mp, weixin-channels, douyin, youtube, kuaishou, zhihu, weibo, toutiao
- 别名：B站, 小红书, 公众号, 视频号, 抖音, YouTube, 快手, 知乎, 微博, 头条号/今日头条
- 特殊关键词：`全平台` = 所有已登录的平台

读取 `workspace/config/platforms.yaml` 校验平台名。

### 2. 检查前置条件
对每个目标平台：
- 检查是否已登录（读取 workspace/auth/）
- 检查是否有适配后的内容（读取 workspace/content/adapted/）
- 如果没有适配内容，先调用 content-adapt Skill

未登录的平台从列表中移除，并通知创作者。

### 3. 展示发布预览
汇总展示所有平台的适配预览：

```
📋 多平台发布预览：

1. 公众号：
   标题：<标题>
   正文：<前100字>...

2. 小红书：
   标题：<标题>
   正文：<前100字>...
   标签：#xx# #xx#

3. B站：
   标题：<标题>
   描述：<前100字>...

确认发布到以上 3 个平台？
```

### 4. 等待确认
等待创作者回复「确认」。如果提出修改 → 回到适配步骤。

### 5. 并行发布（Sub-Agents）
创作者确认后，使用 `sessions_spawn` 为每个平台创建一个 Sub-Agent：

对每个平台：
```
sessions_spawn:
  task: "发布内容到 <平台名>。使用 publish-<platform> skill，profile=<profile>。标题：<title>，内容：<content>，标签：<tags>"
  label: "发布-<平台名>"
  model: "dashscope/qwen-turbo"
```

每个 Sub-Agent：
- 独立操作各自的 Browser Profile
- 执行对应平台的 publish Skill
- 完成后 announce 结果回主 Chat

### 6. 汇总结果
所有 Sub-Agent 完成后，汇总展示：

```
📊 多平台发布结果：

✅ 公众号 — 已群发 [截图]
✅ 小红书 — 已发布 [截图]
❌ B站 — 投稿失败：视频转码中
   建议：稍后重试 /publish bilibili

成功：2/3
```

### 7. 记录
将每个平台的发布结果写入 workspace/content/published/。

## 定时发布
如果创作者使用 `/schedule <时间> <平台列表>`：
1. 先完成内容适配并保存
2. 创建 Cron Job（`schedule.kind: "at"`）在指定时间触发发布
3. 通知创作者：「已安排在 <时间> 发布到 <平台列表>」
