---
name: data-youtube
description: "通过 YouTube Data API 或 Browser RPA 拉取 YouTube 频道数据"
user-invocable: false
metadata: {"openclaw":{"always":true}}
---

# YouTube 数据拉取 Skill

## 概述
优先使用 YouTube Data API（通过 Web Tools），无 API 时 fallback 到 Browser RPA。

## 方式 A：YouTube Data API（推荐）
使用 OpenClaw web 工具发起 HTTP 请求：
- 获取频道统计：`GET https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true`
- 获取视频列表：`GET https://www.googleapis.com/youtube/v3/search?forMine=true&type=video`
- 获取视频统计：`GET https://www.googleapis.com/youtube/v3/videos?part=statistics&id=<videoId>`

API Key 通过环境变量 `YOUTUBE_API_KEY` 配置（见 `.env.example` 和 `openclaw.json` env 段）。
如果未配置 API Key，自动 fallback 到方式 B。

## 方式 B：Browser RPA（Fallback）
profile=youtube，导航到 YouTube Studio 数据分析页面 (`https://studio.youtube.com`)，snapshot 提取数据。

### RPA 步骤
1. 检查登录态。未登录 → 中断，提示 /login youtube。
2. 导航到频道分析（Analytics）页面。
3. snapshot 提取频道概览：订阅者、总观看、近 28 天观看。
4. 导航到内容列表，提取近期视频数据。

## 数据保存
`workspace/data/youtube-YYYY-MM-DD.md`：
```markdown
# YouTube 数据快照 - <日期>

## 频道概览
- 订阅者: xxx
- 总观看次数: xxx
- 近28天观看: xxx

## 近期视频
| 标题 | 观看 | 点赞 | 评论 | 发布时间 |
|------|------|------|------|----------|
| ...  | ...  | ...  | ...  | ...      |
```

## 异常处理
- API Key 无效 → 自动切换到 Browser RPA
- 未登录 → 中断，提示 /login youtube
- API 配额超限 → 切换到 Browser RPA + 通知创作者
- 页面改版 → 截图 + 通知
