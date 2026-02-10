# 工具 RPA Skill 模板

创建新的工具 RPA Skill 时，复制此模板到 `skills/tool-<name>/SKILL.md` 并修改。

---

## SKILL.md 模板

```markdown
---
name: tool-<name>
description: "通过 Browser RPA 操作 <工具名称> 进行内容创作"
user-invocable: false
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# <工具名称> RPA Skill

## 概述
通过浏览器自动化操作 <工具名称> (<URL>)，完成内容生成任务。

## 前置条件
- Browser Profile `<profile名>` 已创建且已登录
- 对应工具在 tools.yaml 中 enabled: true

## 输入
- `prompt`: 要发送给工具的提示词/内容
- `type`: 任务类型 (text | video | audio | image)

## RPA 操作步骤

### 1. 启动浏览器
使用 browser 工具，profile=<profile名>，打开 <URL>

### 2. 检查登录态
执行 browser snapshot，检查页面中是否存在 "<未登录标志文本>"。
如果未登录，立即中断并通知创作者：
"<工具名称> 未登录，请执行 /login <name> 完成登录。"

### 3. 定位输入区域
执行 browser snapshot，找到对话/输入框元素。

### 4. 填入内容
使用 browser type/fill 将提示词填入输入框。

### 5. 触发生成
点击发送/生成按钮。

### 6. 等待完成
轮询策略：
- 每 3-5 秒执行一次 browser snapshot
- 检查完成标志：<描述具体的完成标志，如按钮状态变化、加载指示器消失等>
- 超时时间：120 秒（文本）/ 300 秒（视频/音频）
- 超时后通知创作者手动检查

### 7. 提取结果
snapshot 提取生成的内容文本/文件链接。

### 8. 保存草稿
将结果保存到 workspace/content/drafts/ 并返回给调用方。

## 输出
- `content`: 生成的文本内容（文本类）
- `file_path`: 生成的文件路径（视频/音频/图像类）
- `status`: success | timeout | auth_required | error
- `error`: 错误描述（如有）

## 异常处理
- 登录过期 -> 中断，通知创作者 /login
- 生成超时 -> 截图当前状态，通知创作者
- 页面异常 -> 截图，记录错误，通知创作者
```
