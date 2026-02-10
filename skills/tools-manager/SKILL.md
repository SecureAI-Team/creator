---
name: tools-manager
description: "管理 AI 创作工具：查看、启用、禁用、设置默认工具"
user-invocable: true
metadata: {"openclaw":{"always":true}}
---

# 创作工具管理

## 用途
当创作者执行 `/tools` 相关命令时，管理 AI 创作工具的配置。

## 支持的子命令

### `/tools` 或 `/tools list`
列出所有工具的状态。

操作步骤：
1. 读取 `workspace/config/tools.yaml`
2. 对每个工具，检查：
   - enabled 状态
   - 是否为某类型的默认工具 (default_for)
   - 登录状态（读取 `workspace/auth/<profile>.md`）
3. 按类型分组显示：

```
当前启用的创作工具：
  [文本] ChatGPT Deep Thinking (已登录) ⭐默认
  [视频] NotebookLM Studio (已登录) ⭐默认

未启用的工具：
  [文本] Claude, DeepSeek, Gemini, Kimi, 通义千问 Web

用 /tools enable <名称> 启用工具
用 /tools default <类型> <名称> 设置默认
```

### `/tools enable <名称>`
启用一个工具。

操作步骤：
1. 在 tools.yaml 中将该工具的 `enabled` 设为 `true`
2. 在 openclaw.json 的 `browser.profiles` 中添加对应的 Profile 配置（自动分配 cdpPort）
3. 提示创作者登录：`已启用 <名称>，请执行 /login <名称> 完成登录。`

### `/tools disable <名称>`
禁用一个工具。

操作步骤：
1. 在 tools.yaml 中将该工具的 `enabled` 设为 `false`
2. 如果该工具是某类型的默认工具，提示创作者需要设置新的默认
3. 可选：从 openclaw.json 中移除对应 Profile

### `/tools default <类型> <名称>`
设置某类型的默认工具。

操作步骤：
1. 验证该工具已启用且类型匹配
2. 移除同类型其他工具的 `default_for` 中对应类型
3. 将目标工具的 `default_for` 添加该类型
4. 更新 tools.yaml
5. 确认：`已将 <名称> 设为 <类型> 类默认工具。`

## 注意事项
- 修改 tools.yaml 后，新的配置在下次 Agent 会话中生效
- Profile 端口从 18810 开始自动递增分配
- 禁用工具不会删除已保存的登录态（Profile user-data-dir 保留）
