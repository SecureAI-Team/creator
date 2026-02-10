---
name: publish-log
description: "记录每次发布操作的日志到 Workspace"
metadata: {"openclaw":{"emoji":"📝","events":["command:new"]}}
---

# Publish Log Hook

每次新会话开始时，检查并归档上一会话中的发布记录。
实际的发布日志写入由发布 Skills 在执行过程中完成。

## 日志格式

发布记录保存在 `workspace/content/published/` 目录下，文件名格式：
`YYYY-MM-DD-<platform>-<slug>.md`

```markdown
# 发布记录

- 平台: 小红书
- 标题: <标题>
- 发布时间: 2026-02-10 14:30:00
- 状态: 成功
- 链接: <如有>
- 内容类型: 图文
- 来源草稿: workspace/content/drafts/<草稿文件>
```
