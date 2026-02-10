#!/usr/bin/env bash
# =============================================================================
# Gateway 监控脚本 — 检测异常并通过 Telegram 告警
# =============================================================================
# 建议通过 cron 每 5 分钟运行:
#   */5 * * * * /home/<YOUR_USER>/creator/scripts/monitor-gateway.sh >> /home/<YOUR_USER>/creator/logs/monitor.log 2>&1
# =============================================================================
set -euo pipefail

# 加载环境变量
if [ -f ~/.env.creator ]; then
  source ~/.env.creator
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ------ 配置 ------
DISK_WARN_PERCENT=80
MEM_WARN_PERCENT=85
BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT_ID="${TELEGRAM_USER_ID:-}"

# ------ 告警函数 ------
send_alert() {
  local message="$1"
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local full_message="⚠️ 创作助手告警 [$timestamp]%0A%0A$message"

  if [ -n "$BOT_TOKEN" ] && [ -n "$CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
      -d "chat_id=${CHAT_ID}" \
      -d "text=${full_message}" \
      -d "parse_mode=HTML" > /dev/null 2>&1
    echo "[$timestamp] 告警已发送: $message"
  else
    echo "[$timestamp] 告警（未配置 Telegram）: $message"
  fi
}

# ------ 1. 检查 Gateway 进程 ------
if ! pgrep -f "openclaw" > /dev/null 2>&1; then
  send_alert "OpenClaw Gateway 进程未运行！%0A请检查: sudo systemctl status openclaw"

  # 尝试自动重启（如果使用 systemd）
  if systemctl is-enabled openclaw > /dev/null 2>&1; then
    sudo systemctl restart openclaw
    sleep 5
    if pgrep -f "openclaw" > /dev/null 2>&1; then
      send_alert "✅ Gateway 已自动重启成功"
    else
      send_alert "❌ Gateway 自动重启失败，请手动检查"
    fi
  fi
fi

# ------ 2. 检查磁盘使用率 ------
DISK_USAGE=$(df "$PROJECT_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -ge "$DISK_WARN_PERCENT" ]; then
  send_alert "磁盘使用率达到 ${DISK_USAGE}%（阈值 ${DISK_WARN_PERCENT}%）%0A请运行清理: scripts/cleanup-workspace.sh"
fi

# ------ 3. 检查内存使用率 ------
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -ge "$MEM_WARN_PERCENT" ]; then
  send_alert "内存使用率达到 ${MEM_USAGE}%（阈值 ${MEM_WARN_PERCENT}%）%0A请检查浏览器实例数量"
fi

# ------ 4. 检查 Chromium 进程数 ------
CHROME_COUNT=$(pgrep -c "chromium\|chrome" 2>/dev/null || echo 0)
if [ "$CHROME_COUNT" -gt 12 ]; then
  send_alert "Chromium 进程数异常: ${CHROME_COUNT} 个%0A可能存在泄漏，请检查"
fi

# ------ 5. 健康状态记录 ------
echo "$(date '+%Y-%m-%d %H:%M:%S') | Gateway: $(pgrep -c openclaw 2>/dev/null || echo 0) | Disk: ${DISK_USAGE}% | Mem: ${MEM_USAGE}% | Chrome: ${CHROME_COUNT}"
