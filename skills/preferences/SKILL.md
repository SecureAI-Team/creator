---
name: preferences
description: "查看和修改用户偏好设置"
user-invocable: true
metadata: {"openclaw":{"always":true}}
---

# 用户偏好设置

## 用途
当创作者执行 `/settings` 时，查看和修改个人偏好配置。

## 支持的子命令

### `/settings` 或 `/settings show`
展示当前所有偏好设置：

```
⚙️ 当前设置

📍 基本
  时区: Asia/Shanghai
  语言: 中文

🔔 通知
  级别: 全部通知
  免打扰: 关闭
  发布成功通知: ✅
  登录过期告警: ✅
  每日日报: ✅
  生成进度: ✅

✏️ 创作默认值
  写作风格: 专业但通俗易懂
  目标受众: 对该领域感兴趣的普通读者
  默认字数: 2000
  默认视频时长: 5 分钟

📊 数据
  缓存有效期: 4 小时
  日报时间: 每天 09:00
  选题推荐: 每周一 08:00

修改方式: /settings <项目> <值>
例如: /settings timezone America/New_York
```

### `/settings <项目> <值>`
修改某个设置项。

支持的项目：
- `timezone <时区>` — 修改时区
- `language <zh-CN|en>` — 修改语言
- `notifications <all|important|errors>` — 通知级别
- `quiet_hours <开始>-<结束>` — 免打扰时段（如 23:00-08:00）
- `quiet_hours off` — 关闭免打扰
- `style <描述>` — 默认写作风格
- `audience <描述>` — 默认目标受众
- `word_count <数字>` — 默认文章字数
- `video_duration <数字>` — 默认视频时长（分钟）
- `cache_ttl <小时数>` — 数据缓存有效期
- `report_time <HH:MM>` — 日报发送时间

### 操作步骤
1. 读取 `workspace/config/user-preferences.yaml`
2. 解析用户要修改的字段
3. 验证值的合法性（如时区是否有效、数字范围等）
4. 更新 YAML 文件
5. 确认修改：`✅ 已将 <项目> 修改为 <值>`

### 注意事项
- 修改时区后，Cron 任务需要重新创建才能生效（提示创作者）
- 修改日报时间后，同样需要更新 Cron
- 验证时区字符串的合法性
