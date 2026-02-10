---
name: platform-login
description: "打开指定平台或工具的浏览器，引导创作者手动登录"
user-invocable: true
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]},"always":true}}
---

# 平台/工具登录辅助

## 用途
当创作者执行 `/login <名称>` 时，打开对应的 Browser Profile 浏览器并导航到登录页面，等待创作者手动完成登录。

## 操作步骤

### 1. 解析目标
从用户输入中提取要登录的平台或工具名称。支持的名称来自两个来源：
- **发布平台**：读取 `workspace/config/platforms.yaml` 中的平台列表
- **AI 创作工具**：读取 `workspace/config/tools.yaml` 中 enabled: true 的工具列表

如果用户没有指定名称，列出所有可用的平台和工具供选择。

### 2. 查找配置
根据名称在 platforms.yaml 或 tools.yaml 中查找对应条目，获取：
- `profile`: Browser Profile 名
- `url`: 登录入口 URL
- `name`: 显示名称

### 3. 启动浏览器
使用 browser 工具：
- 指定 `profile=<profile名>`
- 执行 `browser start`（如果尚未启动）
- 执行 `browser navigate` 到对应的 URL

### 4. 通知创作者
告知创作者：
```
已打开 <名称> 的浏览器，请通过 VNC 或本地浏览器完成登录。
登录完成后告诉我，我会验证登录状态。
```

### 5. 验证登录（可选）
当创作者确认登录完成后：
- 执行 `browser snapshot`
- 检查页面中是否不再包含登录标志（参考 auth_check.indicator）
- 如果登录成功，更新 `workspace/auth/` 下的状态文件
- 如果仍未登录，提示创作者重试

### 6. 记录状态
将登录状态写入 `workspace/auth/<profile名>.md`：
```markdown
# <名称> 登录状态
- 状态: 已登录
- 最后检查: <时间戳>
- Profile: <profile名>
```
