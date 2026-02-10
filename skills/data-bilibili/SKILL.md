---
name: data-bilibili
description: "通过 Browser RPA 拉取 B站创作数据"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# B站数据拉取 RPA Skill

## 概述
通过浏览器自动化操作 B站创作中心，提取播放、互动、粉丝等核心数据。

## RPA 操作步骤

### 1. 检查登录
profile=bilibili，导航到 `https://member.bilibili.com/platform/data/overview`。检查登录态。

### 2. 提取数据概览
执行 `browser snapshot`，提取页面中的关键数据：
- 总播放量 / 近期播放量
- 点赞数 / 投币数 / 收藏数
- 粉丝数 / 新增粉丝
- 近期作品数据表现

### 3. 提取单作品数据（可选）
导航到内容管理页面，提取近期每个作品的：
- 播放量、点赞、投币、收藏、弹幕
- 发布时间

### 4. 保存数据快照
保存到 `workspace/data/bilibili-YYYY-MM-DD.md`：
```markdown
# B站数据快照 - <日期>

## 概览
- 总播放量: xxx
- 总粉丝: xxx（+xx）
- 近7日播放: xxx

## 近期作品
| 标题 | 播放 | 点赞 | 投币 | 收藏 | 发布时间 |
|------|------|------|------|------|----------|
| ...  | ...  | ...  | ...  | ...  | ...      |
```

### 5. 返回数据摘要
供日报或 `/data` 指令使用。
