---
name: data-xiaohongshu
description: "通过 Browser RPA 拉取小红书创作者数据"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 小红书数据拉取 RPA Skill

## 概述
通过浏览器自动化操作小红书创作者平台 (https://creator.xiaohongshu.com)，提取笔记互动和粉丝数据。

## 前置条件
- Browser Profile `xiaohongshu` 已创建且已登录

## RPA 操作步骤

### 1. 检查登录
profile=xiaohongshu，导航到 `https://creator.xiaohongshu.com/statistics`。
执行 `browser snapshot` 检查登录态。
如果出现 "登录" → 中断，通知创作者。

### 2. 提取账号概览
执行 `browser snapshot`，提取数据概览：
- 总粉丝数
- 新增粉丝
- 总获赞与收藏
- 笔记总浏览量

### 3. 提取笔记数据
导航到「内容管理」或「笔记数据」，提取近期笔记：
- 笔记标题
- 浏览量（曝光/阅读）
- 点赞数
- 收藏数
- 评论数
- 分享数
- 发布时间

### 4. 提取粉丝画像（可选）
如有粉丝分析页面，提取：
- 性别分布
- 年龄分布
- 地域分布

### 5. 保存数据快照
保存到 `workspace/data/xiaohongshu-YYYY-MM-DD.md`：
```markdown
# 小红书数据快照 - <日期>

## 账号概览
- 总粉丝: xxx
- 新增粉丝 (7日): +xxx
- 总获赞与收藏: xxx

## 近期笔记
| 标题 | 浏览 | 点赞 | 收藏 | 评论 | 分享 | 发布时间 |
|------|------|------|------|------|------|----------|
| ...  | ...  | ...  | ...  | ...  | ...  | ...      |
```

### 6. 返回数据摘要

## 反爬策略
> 参考: MediaCrawler 项目 (NanmiCoder/MediaCrawler) 的反爬经验

小红书反爬是所有平台中**最严格**的，需要特别注意：
- **操作间隔**：每次 snapshot/导航后等待 2-3 秒，模拟人类浏览
- **翻页间隔**：翻页后等待 1.5-2.5 秒（随机）
- **单次抓取量**：每次最多抓取 20 条数据，避免触发限制
- **避免规律请求**：操作间隔添加随机抖动（±500ms）
- **登录态监测**：每次操作前确认 Cookie 有效
- **User-Agent**：使用浏览器默认 UA，不修改

## 异常处理
- 未登录 → 中断，提示 /login xiaohongshu
- 反爬验证码 → 截图 + 通知创作者手动处理（通过 VNC）
- 页面改版 → 截图 + 通知
- 请求被限制 → 等待 5 分钟后重试，仍失败则通知
