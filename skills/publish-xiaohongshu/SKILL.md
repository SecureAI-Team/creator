---
name: publish-xiaohongshu
description: "通过 Browser RPA 将图文/视频笔记发布到小红书"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 小红书发布 RPA Skill

## 概述
通过浏览器自动化操作小红书创作者平台 (https://creator.xiaohongshu.com)，完成图文或视频笔记的发布。

## 前置条件
- Browser Profile `xiaohongshu` 已创建且已登录
- 已有适配后的内容（来自 content-adapt Skill）

## 输入
- `title`: 笔记标题（≤20 字）
- `content`: 笔记正文（≤1000 字，含 emoji 和标签）
- `tags`: 标签列表（5-10 个）
- `images`: 图片文件路径列表（图文类，可选）
- `video`: 视频文件路径（视频类，可选）
- `content_type`: "text" 或 "video"

## RPA 操作步骤

### 1. Preflight 检查
使用 browser 工具，profile=xiaohongshu：
- 导航到 `https://creator.xiaohongshu.com/publish/publish`
- `browser snapshot` 检查登录态
- 如果出现 "登录" → 中断，通知：
  ```
  小红书未登录，请执行 /login xiaohongshu 完成登录。
  ```

### 2. 选择发布类型
- 如果是图文笔记：确认在「图文」发布模式
- 如果是视频笔记：切换到「视频」发布模式

### 3. 上传媒体（如有）
图文类：
- 找到图片上传区域
- 使用 `browser upload` 上传图片文件
- 等待上传完成

视频类：
- 找到视频上传区域
- 使用 `browser upload` 上传视频文件
- 等待上传和处理完成（可能需要较长时间）

### 4. 填写标题
- 找到标题输入框
- 使用 `browser fill` 填入标题
- 确保不超过 20 字

### 5. 填写正文
- 找到正文输入区域
- 使用 `browser fill` 或 `browser type` 填入正文
- 正文中已包含标签（格式如 #话题标签#）
- 确保不超过 1000 字

### 6. 添加标签（如果正文中未包含）
- 如果正文中已有 # 标签，跳过此步
- 否则找到标签/话题输入区域
- 逐个输入标签

### 7. 预览确认
在提交前：
- `browser screenshot` 截取编辑器当前状态
- 将截图发送给创作者：
  ```
  📋 小红书发布预览：
  [截图]
  
  标题：<标题>
  正文：<正文>
  标签：<标签列表>
  
  确认发布？（回复「确认」或修改意见）
  ```

### 8. 发布
当创作者确认后：
- 点击「发布」按钮
- 处理可能出现的确认对话框
- 等待发布完成

### 9. 验证结果
- `browser snapshot` 检查是否出现发布成功提示
- `browser screenshot` 截取结果
- 如果失败，截取错误信息

### 10. 记录发布日志
保存到 `workspace/content/published/`：
```markdown
# 小红书发布记录

- 平台: 小红书
- 标题: <标题>
- 发布时间: <时间戳>
- 状态: 成功/失败
- 类型: 图文/视频
- 标签: <标签>
- 来源: <原始草稿路径>
```

### 11. 返回结果
- `status`: success / failed / auth_required
- `screenshot`: 结果截图路径
- `error`: 错误信息（如有）

## RPA 元素选择指南
> 参考: social-auto-upload 项目 (dreammis/social-auto-upload) 的 xiaohongshu uploader 逻辑

- 发布入口：`https://creator.xiaohongshu.com/publish/publish`
- 图片/视频上传：查找 `input[type="file"]` 元素
- 标题输入：通过 `placeholder`（如"填写标题"）定位 input 元素
- 正文编辑：`contenteditable` 区域，通过 snapshot 定位
- 话题标签：在正文中输入 `#` 触发话题搜索浮层，选择匹配项
- 发布按钮：通过 `role=button` + 文本"发布" 定位

**注意**：小红书反爬较严格，操作间隔建议 1-2 秒模拟人类行为。

**选择器优先级**: aria-label > placeholder > role > text content > 位置

## 异常处理
- **未登录** → 中断，提示 /login xiaohongshu
- **图片/视频上传失败** → 重试一次，仍失败则通知
- **标题超长** → 自动截断到 20 字并提示
- **正文超长** → 提示创作者精简
- **发布审核提示** → 截图，通知创作者
- **反爬验证码** → 截图 + 通知创作者手动处理
- **元素定位失败** → 截图 + 通知，可能是页面改版
