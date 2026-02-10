---
name: comment-monitor
description: "监控各平台评论并提供智能回复建议"
user-invocable: true
command: /comments
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 评论管理 Skill

## 概述
通过浏览器 RPA 抓取各平台的最新评论，提供评论摘要、情感分析和智能回复建议。
支持手动触发和定时自动检查。

> **参考**: MediaCrawler 项目 (NanmiCoder/MediaCrawler) 中的评论抓取逻辑。

## 用法
```
/comments                    -- 查看所有平台最新评论
/comments bilibili           -- 查看B站最新评论
/comments reply              -- 进入评论回复模式
看看最近有什么评论
帮我回复一下评论
```

## 支持平台
所有已在 platforms.yaml 中注册且已登录的平台：
- B站、小红书、微信公众号、微信视频号、抖音、YouTube
- 快手、知乎、微博、头条号

## 执行流程

### 1. 确定目标平台
- 如用户指定了平台 → 只查该平台
- 如未指定 → 遍历所有已登录的平台

### 2. 抓取评论 (per platform)
对每个目标平台，使用对应的 Browser Profile：

#### B站
- profile=bilibili，导航到 `https://member.bilibili.com/platform/comment`
- `browser snapshot` 提取最新评论列表

#### 小红书
- profile=xiaohongshu，导航到创作者后台「互动管理」
- 提取最新评论和回复

#### 抖音
- profile=douyin，导航到 `https://creator.douyin.com/creator-micro/comment`
- 提取最新评论

#### YouTube
- profile=youtube，导航到 YouTube Studio「评论」
- 提取最新评论

#### 微信公众号
- profile=weixin-mp，导航到公众号后台「留言管理」
- 提取最新留言

#### 快手
- profile=kuaishou，导航到创作者后台「评论管理」
- 提取最新评论

#### 知乎
- profile=zhihu，导航到「我的」→「评论」
- 提取最新评论

#### 微博
- profile=weibo，导航到评论列表
- 提取最新评论

#### 头条号
- profile=toutiao，导航到后台评论管理
- 提取最新评论

### 3. 评论汇总
汇总所有平台评论，输出格式：
```
📋 评论汇总（最近24小时）

【B站】3 条新评论
1. @用户A (视频:xxx): "很棒的内容！请问..." [正面]
2. @用户B (视频:xxx): "有一个问题..." [中性]
3. @用户C (视频:xxx): "不同意你的观点..." [负面]

【小红书】5 条新评论
...

【抖音】2 条新评论
...
```

### 4. 情感分析
使用 Agent 的 LLM 能力对评论进行分类：
- 🟢 正面（赞美、感谢、支持）
- 🟡 中性（提问、讨论）
- 🔴 负面（批评、投诉、攻击）
- ⚠️ 需关注（可能的争议、举报风险）

### 5. 智能回复建议
对重要评论（提问、负面反馈等），Agent 生成回复建议：
```
💬 建议回复：

@用户A 的提问: "请问这个工具在哪下载？"
建议回复: "谢谢关注！工具链接在视频简介里，你可以直接点击下载。如果有问题欢迎继续交流～"

确认发送请回复序号，修改请直接输入新回复。
```

### 6. 执行回复（需确认）
创作者确认后，通过 RPA 在对应平台提交回复。
**始终需要创作者确认后再发送回复。**

## 定时检查配置（可选）
可通过 Cron 配置自动检查：
```yaml
# 每 4 小时检查一次评论
cron: "0 */4 * * *"
action: 检查所有平台评论，如有重要评论（提问/负面）则通知创作者
```

## 数据保存
评论数据保存到 `workspace/data/comments-YYYY-MM-DD.md`。

## 异常处理
- 平台未登录 → 跳过该平台，汇总提示
- 反爬验证码 → 截图通知
- 评论过多 → 只抓取最近 50 条
- 回复提交失败 → 截图通知
