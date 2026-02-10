---
name: tool-notebooklm
description: "通过 Browser RPA 操作 Google NotebookLM Studio 生成视频概览"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# Google NotebookLM Studio RPA Skill

## 概述
通过浏览器自动化操作 NotebookLM Studio (https://notebooklm.google.com)，将文本内容转换为视频概览。

## 前置条件
- Browser Profile `notebooklm` 已创建且已登录（Google 账号）
- 工具在 tools.yaml 中 enabled: true
- 已有文本脚本（通常由文本工具先生成）

## 输入
- `text_content`: 要转换为视频的文本/脚本内容
- `title`: 项目标题（可选）

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，指定 `profile=notebooklm`，导航到 `https://notebooklm.google.com`。

### 2. 检查登录态
执行 `browser snapshot`。
检查页面中是否存在 "Sign in" 文本或 Google 登录按钮。
如果未登录 → 中断并通知：
```
NotebookLM 未登录，请执行 /login notebooklm 完成 Google 登录。
```

### 3. 创建新 Notebook
- 查找并点击 "New notebook" 或 "+" 按钮
- 如果有标题输入框，填入项目标题
- 等待 notebook 创建完成

### 4. 添加文本源
- 查找 "Add source" 或类似按钮
- 选择「粘贴文本」选项
- 使用 `browser fill` 将文本内容粘贴到输入区域
- 确认添加
- 等待文本源处理完成

### 5. 进入 Studio 面板
- 查找并点击 "Studio" 或 "Audio Overview" / "Video Overview" 标签
- 等待 Studio 面板加载

### 6. 触发视频概览生成
- 查找 "Video Overview" 或 "Generate" 按钮
- 点击生成
- 注意：可能有确认对话框，需要确认

### 7. 等待视频生成
**异步轮询策略**（视频生成可能需要数分钟）：
- 每 15 秒执行一次 `browser snapshot`
- 检查完成标志：
  - ✅ 完成：出现 "Download" 按钮或视频预览播放器
  - ⏳ 生成中：显示进度条或 "Generating..." 文本
  - ❌ 失败：出现错误消息
- 超时时间：600 秒（10 分钟）

**进度反馈**（读取 `workspace/config/user-preferences.yaml` 的 `notifications.types.generation_progress`）：
- 30 秒后 → 通知：「视频正在生成，请耐心等待...」
- 120 秒后 → 通知：「视频仍在生成中，预计还需几分钟。输入 /cancel 可停止等待。」
- 300 秒后 → 通知：「已等待 5 分钟，视频生成较慢。继续等待中...」
- 超时前 30 秒 → 通知：「即将达到等待上限，若仍未完成将截图通知你。」

### 8. 下载视频
生成完成后：
- 查找并点击 "Download" 按钮
- 使用 `browser wait` 等待下载完成
- 视频文件保存到 `workspace/content/media/`

### 9. 保存记录
将结果保存到 `workspace/content/drafts/`：
```markdown
# NotebookLM 视频创作记录

- 工具: Google NotebookLM Studio
- 时间: <时间戳>
- 类型: video

## 输入文本
<text_content 摘要>

## 视频文件
路径: workspace/content/media/<文件名>

## 状态
成功
```

### 10. 返回结果
返回给 content-pipeline：
- `file_path`: 视频文件路径
- `status`: success / timeout / auth_required / error
- `draft_path`: 记录文件路径

## 异常处理
- **未登录** → 中断，提示 /login notebooklm
- **生成超时 (>600s)** → 截图 + 通知创作者手动检查
- **生成失败** → 截图错误信息 + 建议重试
- **文本过长** → 提示创作者缩减文本或分段
