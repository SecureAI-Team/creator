---
name: trending-monitor
description: "定时监控各平台热搜热点，推送高相关度选题"
type: cron
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# 热点监控 Hook

## 触发方式
通过 Cron Job 定时触发，默认每天 3 次。
时区从 `workspace/config/user-preferences.yaml` 的 `timezone` 字段读取。

## Cron 配置
```bash
openclaw cron add \
  --name "热点监控-早间" \
  --cron "0 9 * * *" \
  --tz "<用户时区>" \
  --session isolated \
  --message "执行热点监控：抓取各平台热搜，分析与创作者领域的相关性，如有高价值选题则推送。" \
  --announce \
  --channel telegram \
  --to "<chat_id>"

openclaw cron add \
  --name "热点监控-午间" \
  --cron "0 14 * * *" \
  --tz "<用户时区>" \
  --session isolated \
  --message "执行热点监控：抓取各平台午间热搜。" \
  --announce \
  --channel telegram \
  --to "<chat_id>"

openclaw cron add \
  --name "热点监控-晚间" \
  --cron "0 20 * * *" \
  --tz "<用户时区>" \
  --session isolated \
  --message "执行热点监控：抓取各平台晚间热搜。" \
  --announce \
  --channel telegram \
  --to "<chat_id>"
```

## 行为
1. 调用 `trending-monitor` Skill 抓取各平台热点
2. 如果发现与创作者领域高度相关的热点（相关度 ≥ 4/5），主动推送通知
3. 所有热点数据保存到 `workspace/topics/trending-YYYY-MM-DD.md`

## 推送策略
- 高相关度热点：立即推送，带选题建议
- 中等相关度：汇总到日报中
- 低相关度：仅存档
- 遵守 quiet hours 设置（从 user-preferences.yaml 读取）
