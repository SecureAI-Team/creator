---
name: data-weixin-channels
description: "通过 Browser RPA 拉取微信视频号数据"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 微信视频号数据拉取 RPA Skill

## 概述
通过浏览器自动化操作视频号助手 (https://channels.weixin.qq.com/platform)，提取视频播放和互动数据。

## 前置条件
- Browser Profile `weixin-channels` 已创建且已登录

## RPA 操作步骤

### 1. 检查登录
profile=weixin-channels，导航到 `https://channels.weixin.qq.com/platform`。
执行 `browser snapshot` 检查登录态。
如果出现 "扫码登录" → 中断，通知创作者。

### 2. 进入数据模块
导航到「数据中心」或主页的数据概览区域。

### 3. 提取账号数据
执行 `browser snapshot`，提取：
- 总粉丝数
- 新增粉丝
- 总播放量
- 总互动量

### 4. 提取作品数据
导航到作品列表，提取近期视频：
- 视频标题
- 播放量
- 点赞数
- 评论数
- 转发数
- 发布时间

### 5. 保存数据快照
保存到 `workspace/data/weixin-channels-YYYY-MM-DD.md`：
```markdown
# 微信视频号数据快照 - <日期>

## 账号概览
- 总粉丝: xxx
- 新增粉丝 (7日): +xxx
- 总播放: xxx

## 近期作品
| 标题 | 播放 | 点赞 | 评论 | 转发 | 发布时间 |
|------|------|------|------|------|----------|
| ...  | ...  | ...  | ...  | ...  | ...      |
```

### 6. 返回数据摘要

## 异常处理
- 未登录 → 中断，提示 /login weixin-channels（需微信扫码）
- 页面加载超时 → 刷新重试
- 页面改版 → 截图 + 通知
