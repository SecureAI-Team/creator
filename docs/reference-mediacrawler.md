# 参考项目：MediaCrawler

> GitHub: https://github.com/NanmiCoder/MediaCrawler (43,600+ stars)
> 技术栈: Python + Playwright
> 免责声明: 仅供学习参考，禁止商业用途

## 概述
MediaCrawler 是最流行的中文自媒体多平台数据采集工具。
本项目的 data-* skills 可参考其 Playwright 数据提取逻辑优化 RPA 步骤。

## 支持平台
小红书、抖音、快手、B站、微博、百度贴吧、知乎

## 核心技术原理

### 1. 登录态保留
- 基于 Playwright 浏览器自动化框架
- 登录后保存浏览器上下文（Context），实现登录态持久化
- 下次启动时加载保存的上下文，无需重新登录

**对我们的启示**：
- OpenClaw 的 Browser Profile 已实现等价功能
- 每个平台独立 Profile，天然隔离

### 2. 签名参数获取（无需 JS 逆向）
- 利用保留登录态的浏览器环境
- 通过 JavaScript 表达式执行获取签名参数
- 无需逆向复杂的加密算法

**对我们的启示**：
- 我们的 data skills 通过 `browser snapshot` 直接提取页面渲染后的数据
- 不需要调用 API 或逆向签名
- 但如果需要提取大量数据，可以参考 MediaCrawler 的 JS 执行方式

### 3. 反爬策略应对

#### 3.1 操作间隔
- 在页面操作间添加随机延迟（1-3 秒）
- 模拟人类浏览行为
- 避免过于规律的请求模式

#### 3.2 登录方式
- 支持多种登录方式：Cookie、二维码、手机号
- Cookie 优先（最无感）
- 二维码扫码（最安全，对应我们的 VNC 登录流程）

#### 3.3 IP 代理池
- 支持配置 IP 代理
- 防止单 IP 被封

**对我们的启示**：
- 在 data-* skills 的 RPA 步骤中添加随机延迟
- 建议操作间隔：
  - 页面导航后等待 2-3 秒
  - 翻页/滚动后等待 1-2 秒
  - 连续操作间等待 0.5-1 秒
- 单次数据拉取不要获取太多页面
- ECS 服务器 IP 固定，如被限制可考虑代理

### 4. 各平台数据提取要点

#### 小红书
- 搜索页面: `https://www.xiaohongshu.com/search_result?keyword=xxx`
- 笔记详情: `https://www.xiaohongshu.com/explore/{note_id}`
- 创作者主页: `https://www.xiaohongshu.com/user/profile/{user_id}`
- **注意**: 小红书反爬最严，需要较长的操作间隔
- 数据提取：通过 snapshot 提取页面渲染后的结构化数据

#### 抖音
- 需要 Node.js 环境（用于签名）
- 搜索页面: `https://www.douyin.com/search/xxx`
- 视频详情: `https://www.douyin.com/video/{video_id}`
- 创作者主页: `https://www.douyin.com/user/{user_id}`
- **注意**: 抖音页面为 SPA，需要等待数据加载

#### 快手
- 搜索页面: `https://www.kuaishou.com/search/video?searchKey=xxx`
- 视频详情: `https://www.kuaishou.com/short-video/{video_id}`
- 数据提取相对稳定

#### B站
- 搜索页面: `https://search.bilibili.com/all?keyword=xxx`
- 视频详情: `https://www.bilibili.com/video/{bvid}`
- 创作者空间: `https://space.bilibili.com/{uid}`
- **注意**: B站 API 相对开放，数据提取较容易

#### 微博
- 搜索页面: `https://s.weibo.com/weibo?q=xxx`
- 微博详情: `https://weibo.com/{uid}/{weibo_id}`
- **注意**: 微博反爬中等，需要登录态

#### 知乎
- 搜索页面: `https://www.zhihu.com/search?q=xxx`
- 问题页面: `https://www.zhihu.com/question/{qid}`
- 文章页面: `https://zhuanlan.zhihu.com/p/{article_id}`
- **注意**: 知乎需要 Node.js 环境（用于签名）

### 5. 数据存储格式
MediaCrawler 支持：CSV、JSON、Excel、SQLite、MySQL
我们的 data skills 统一使用 Markdown 格式存储到 workspace/data/。

## 整合方式

### 方式一：参考逻辑（当前采用）
将 MediaCrawler 的数据提取思路融入 OpenClaw Agent 的 browser snapshot 工作流。
重点参考：
- 各平台 URL 路由
- 反爬策略（操作间隔、重试逻辑）
- 数据字段标准化

### 方式二：竞品分析功能
MediaCrawler 的「关键词搜索」和「创作者主页爬取」功能可用于实现竞品分析：
1. 搜索特定关键词，获取热门内容
2. 爬取竞争对手主页，分析其内容策略
3. 提取评论数据，了解用户反馈

这可以作为 trending-monitor 和未来的竞品分析 skill 的数据来源。
