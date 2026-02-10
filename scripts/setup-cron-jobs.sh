#!/usr/bin/env bash
# =============================================================================
# 初始化 Cron Jobs
# 在 OpenClaw Gateway 启动后运行此脚本创建默认的 Cron 任务
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 从 user-preferences.yaml 读取时区（默认 Asia/Shanghai）
TZ_SETTING="Asia/Shanghai"
PREFS_FILE="$PROJECT_DIR/workspace/config/user-preferences.yaml"
if [ -f "$PREFS_FILE" ]; then
  PARSED_TZ=$(grep '^timezone:' "$PREFS_FILE" | sed 's/timezone: *"\?\([^"]*\)"\?/\1/' | tr -d ' ')
  if [ -n "$PARSED_TZ" ]; then
    TZ_SETTING="$PARSED_TZ"
  fi
fi
echo "=== 配置 Cron Jobs（时区: $TZ_SETTING）==="

# 1. 每日数据日报 (每天早上 9 点)
echo "[1/6] 创建每日数据日报任务..."
openclaw cron add \
  --name "每日数据日报" \
  --cron "0 9 * * *" \
  --tz "$TZ_SETTING" \
  --session isolated \
  --message "执行每日数据日报：拉取所有已登录平台的最新数据，使用 daily-report skill 生成汇总日报。" \
  --announce

# 2. 登录态巡检 (每 4 小时)
echo "[2/6] 创建登录态巡检任务..."
openclaw cron add \
  --name "登录态巡检" \
  --cron "0 */4 * * *" \
  --tz "$TZ_SETTING" \
  --session isolated \
  --message "执行登录态巡检：检查所有已启用平台和 AI 工具的登录状态，使用 auth-status skill 汇总。如有过期，列出需要重新登录的列表。" \
  --announce

# 3. 每周选题灵感 (每周一早上 8 点)
echo "[3/6] 创建每周选题灵感任务..."
openclaw cron add \
  --name "每周选题灵感" \
  --cron "0 8 * * 1" \
  --tz "$TZ_SETTING" \
  --session isolated \
  --message "执行每周选题推荐：使用 topic-research skill 分析本周热点，结合历史数据表现，推荐 5-8 个选题方向。" \
  --announce

# 4. 热点监控-早间 (每天早上 9 点)
echo "[4/6] 创建热点监控-早间任务..."
openclaw cron add \
  --name "热点监控-早间" \
  --cron "0 9 * * *" \
  --tz "$TZ_SETTING" \
  --session isolated \
  --message "执行热点监控：使用 trending-monitor skill 抓取各平台热搜，分析与创作者领域的相关性，如有高价值选题则推送。" \
  --announce

# 5. 热点监控-午间 (每天下午 2 点)
echo "[5/6] 创建热点监控-午间任务..."
openclaw cron add \
  --name "热点监控-午间" \
  --cron "0 14 * * *" \
  --tz "$TZ_SETTING" \
  --session isolated \
  --message "执行热点监控：抓取各平台午间热搜，推送高相关度选题。" \
  --announce

# 6. 热点监控-晚间 (每天晚上 8 点)
echo "[6/6] 创建热点监控-晚间任务..."
openclaw cron add \
  --name "热点监控-晚间" \
  --cron "0 20 * * *" \
  --tz "$TZ_SETTING" \
  --session isolated \
  --message "执行热点监控：抓取各平台晚间热搜，推送高相关度选题。" \
  --announce

echo ""
echo "=== Cron Jobs 配置完成 ==="
echo "使用 openclaw cron list 查看所有定时任务"
