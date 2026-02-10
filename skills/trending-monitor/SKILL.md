---
name: trending-monitor
description: "监控各平台热搜/热点话题并推送选题建议"
user-invocable: true
command: /trending
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 热点监控 Skill

## 概述
通过浏览器 RPA 抓取各平台的热搜榜和热点话题，分析与创作者领域的相关性，推送有价值的选题建议。
支持手动查询和定时自动监控（Cron Hook）。

## 用法
```
/trending                     -- 查看当前各平台热点
/trending douyin              -- 查看抖音热搜
/trending tech                -- 查看科技领域热点
今天有什么热点？
有什么可以蹭的热点？
```

## 数据来源

### 抖音热搜
- profile=douyin，导航到 `https://www.douyin.com/hot`
- 提取热搜榜单（前 50 条）

### 微博热搜
- profile=weibo，导航到 `https://s.weibo.com/top/summary`
- 提取实时热搜榜（前 50 条）
- 微博热搜是最实时的舆论风向标

### 知乎热榜
- profile=zhihu，导航到 `https://www.zhihu.com/hot`
- 提取知乎热榜（前 50 条）
- 知乎热榜侧重深度讨论和知识性话题

### B站热门
- profile=bilibili，导航到 `https://www.bilibili.com/v/popular/rank/all`
- 提取热门视频/排行榜

### 小红书热点
- profile=xiaohongshu，导航到搜索页面
- 提取热门搜索词和话题

### 快手热搜
- profile=kuaishou，导航到快手热搜页面
- 提取热搜话题

### 头条热榜
- profile=toutiao，导航到 `https://www.toutiao.com/hot-event/hot-board/`
- 提取头条热榜

### YouTube Trending
- profile=youtube，导航到 `https://www.youtube.com/feed/trending`
- 提取热门视频

## 执行流程

### 1. 抓取热点数据
并行（通过 Sub-Agent）抓取各平台热搜/热榜。
每个平台提取：
- 排名
- 话题/标题
- 热度值/搜索量（如有）
- 分类/标签

### 2. 去重和合并
跨平台去重相同话题，合并热度信息：
- 同一话题在多个平台出现 → 标记为「跨平台热点」
- 计算综合热度得分

### 3. 相关性分析
使用 Agent 的 LLM 能力，结合创作者的：
- 历史创作内容（从 workspace/content/published/ 分析）
- 领域偏好（从 user-preferences.yaml 获取）
- 过往选题方向

判断每个热点与创作者的相关度（高/中/低）。

### 4. 生成选题建议
输出格式：
```
🔥 热点速报 (2025-xx-xx xx:00)

━━ 跨平台热点 ━━
1. 🔴 #xxx话题# (微博热搜 #3 / 抖音热搜 #7 / 知乎热榜 #12)
   热度: ████████░░ 8/10
   相关度: ⭐⭐⭐⭐ (高)
   💡 选题建议: 可以从xxx角度切入，结合你之前关于xxx的内容...

2. 🟠 #yyy话题# (微博热搜 #5 / 头条热榜 #2)
   热度: ███████░░░ 7/10
   相关度: ⭐⭐⭐ (中)
   💡 选题建议: ...

━━ 抖音热搜 TOP5 ━━
1. xxx - 热度 xxx万
2. ...

━━ 微博热搜 TOP5 ━━
1. xxx - 热度 xxx万
2. ...

回复话题编号可直接开始创作。
```

### 5. 快捷创作入口
创作者回复话题编号 → 自动调用 content-pipeline skill 开始创作。

## 定时监控配置
通过 Cron 配置自动监控：
```yaml
# 每天 3 次：早上 9 点、下午 2 点、晚上 8 点
cron: "0 9,14,20 * * *"
action: 抓取各平台热点，如有高相关度热点则主动推送
```

## 数据保存
热点数据保存到 `workspace/topics/trending-YYYY-MM-DD.md`。
历史热点数据可用于分析趋势规律。

## 异常处理
- 平台未登录 → 跳过该平台，用已登录平台的数据
- 反爬验证码 → 截图通知
- 无热点页面 → 跳过
- 抓取超时 → 使用已获取的部分数据
