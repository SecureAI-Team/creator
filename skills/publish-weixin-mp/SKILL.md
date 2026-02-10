---
name: publish-weixin-mp
description: "通过 Browser RPA 将图文内容发布到微信公众号"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 微信公众号发布 RPA Skill

## 概述
通过浏览器自动化操作微信公众号后台 (https://mp.weixin.qq.com)，完成图文消息的编辑与群发。

## 前置条件
- Browser Profile `weixin-mp` 已创建且已登录
- 已有适配后的内容（来自 content-adapt Skill）

## 输入
- `title`: 文章标题（≤64 字）
- `content`: 文章正文（适配后的公众号版本）
- `cover_description`: 封面图描述（可选，用于提示创作者）
- `draft_only`: 是否仅保存草稿不群发（默认 false）

## RPA 操作步骤

### 1. Preflight 检查
使用 browser 工具，profile=weixin-mp：
- 导航到 `https://mp.weixin.qq.com`
- `browser snapshot` 检查登录态
- 如果出现 "扫码登录" → 中断，通知：
  ```
  微信公众号未登录，请执行 /login weixin-mp 完成扫码登录。
  ```

### 2. 进入图文编辑
- 在公众号后台找到「创作」或「内容管理」入口
- 点击「写新图文」或「新建图文消息」
- 等待编辑器页面加载完成

### 3. 填写标题
- 找到标题输入框
- 使用 `browser fill` 填入标题
- 验证字数不超过 64 字

### 4. 填写正文
- 找到正文编辑区域（富文本编辑器）
- 使用 `browser fill` 或 `browser type` 填入正文内容
- 注意：公众号编辑器是富文本，可能需要特殊处理格式

### 5. 设置封面（可选）
- 如果有封面图建议，提示创作者手动上传
- 或者使用编辑器自带的图片功能

### 6. 预览确认
在提交前：
- `browser screenshot` 截取编辑器当前状态
- 将截图发送给创作者
- 等待创作者确认：
  ```
  📋 公众号发布预览：
  [截图]
  
  标题：<标题>
  正文：<前200字>...
  
  确认群发？（回复「确认」或修改意见）
  ```

### 7. 保存/群发
根据 `draft_only` 参数：
- **仅保存草稿**：点击「保存草稿」按钮
- **群发**：
  1. 点击「群发」或「发布」按钮
  2. 处理可能出现的确认对话框
  3. 等待发布完成

### 8. 验证发布结果
- `browser snapshot` 检查是否出现发布成功提示
- `browser screenshot` 截取结果页面
- 如果失败，截取错误信息

### 9. 记录发布日志
保存到 `workspace/content/published/`：
```markdown
# 公众号发布记录

- 平台: 微信公众号
- 标题: <标题>
- 发布时间: <时间戳>
- 状态: 成功/失败
- 类型: 图文
- 来源: <原始草稿路径>
```

### 10. 返回结果
- `status`: success / failed / auth_required / draft_saved
- `screenshot`: 结果截图路径
- `error`: 错误信息（如有）

## 异常处理
- **未登录** → 中断，提示 /login weixin-mp
- **编辑器加载失败** → 刷新重试一次
- **群发失败** → 截图错误，检查是否超过每日群发次数限制
- **内容审核不通过** → 截图提示信息，通知创作者修改
