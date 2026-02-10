# 参考项目：social-auto-upload

> GitHub: https://github.com/dreammis/social-auto-upload (8400+ stars)
> 技术栈: Python + Playwright
> 许可证: MIT

## 概述
social-auto-upload 是最流行的中文社交媒体多平台视频自动上传工具。
本项目的 publish-* skills 可参考其 Playwright 自动化逻辑优化 RPA 步骤。

## 支持平台
- 抖音、B站、小红书、快手、视频号、百家号、TikTok

## 关键设计决策（可参考）

### 1. 元素选择策略
项目作者在设计之初就考虑了平台页面变化的问题：
> "在初期设计的时候，其实我已经参考了某些不可变元素去选择，
>  极大的避免了后期因为平台页面修改导致的元素变化"

**对我们的启示**：
- 在 RPA Skill 中使用 `browser snapshot` 时，优先匹配以下不变元素：
  - `role` 属性（如 button, textbox, heading）
  - `aria-label` 属性
  - `placeholder` 属性
  - `data-testid` 等测试 ID
- 避免依赖：
  - CSS class 名（经常变化）
  - DOM 层级路径
  - 动态生成的 ID

### 2. Cookie 管理
- 每个平台的 Cookie 独立存储
- 登录后 Cookie 持久化到文件
- 下次操作时加载 Cookie 避免重复登录

**对我们的启示**：
- OpenClaw 的 Browser Profile 已内置持久化 Cookie 的能力
- 每个平台使用独立 Profile，天然实现了 Cookie 隔离
- auth-health-check Hook 定期检查 Cookie 有效性

### 3. 各平台上传核心逻辑

#### 抖音 (douyin)
- 上传入口: `https://creator.douyin.com/creator-micro/content/upload`
- 视频上传：找到文件上传 input 元素，通过 `set_input_files` 上传
- 标题/描述：在编辑区直接填写
- 话题标签：在描述区使用 #话题# 格式
- 定时发布：点击定时发布选项，选择日期时间
- 发布按钮：页面底部「发布」按钮

#### B站 (bilibili)
- 上传入口: `https://member.bilibili.com/platform/upload/video/frame`
- 视频上传：拖拽区或文件选择
- 等待转码：轮询进度条直到 100%
- 分区选择：通过下拉菜单
- 标签：输入后回车确认

#### 小红书 (xiaohongshu)
- 上传入口: `https://creator.xiaohongshu.com/publish/publish`
- 图文和视频走不同的发布流程
- 标题限制 20 字
- 内容限制 1000 字
- 话题通过 # 触发搜索

#### 快手 (kuaishou)
- 上传入口: `https://cp.kuaishou.com/article/publish/video`
- 视频上传后需要等待处理
- 描述区填写文案和话题
- 封面可从视频帧中选择

#### 视频号 (weixin-channels)
- 通过微信视频号助手网页版
- 需要微信扫码登录
- 视频上传 + 描述 + 话题

#### 百家号 (baijiahao)
- 上传入口: `https://baijiahao.baidu.com/builder/rc/edit?type=videoV2`
- 需要百度账号登录
- 支持视频和图文

### 4. 定时发布
项目基于"第二天"的时间逻辑进行定时发布：
- 设置发布时间为第二天的特定时段
- 各平台定时发布的 UI 操作略有不同

### 5. Docker 部署
- 提供 Dockerfile 和 Docker Compose
- 后端 API 端口 5409
- 前端 Vue 管理界面

## 整合方式

### 方式一：参考逻辑，纯 RPA Skill
将 social-auto-upload 的 Playwright 操作逻辑翻译为 OpenClaw Agent 的 browser 工具指令。
这是当前采用的方式。

### 方式二：API 集成（可选）
social-auto-upload 提供了 API 封装，理论上可以：
1. 在 ECS 上 Docker 部署 social-auto-upload
2. 通过 OpenClaw Agent 的 Web 工具调用其 API
3. 实现混合自动化

这种方式更稳定，但增加了系统复杂度。适合未来优化阶段考虑。
