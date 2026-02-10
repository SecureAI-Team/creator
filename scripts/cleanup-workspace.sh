#!/usr/bin/env bash
# =============================================================================
# Workspace 磁盘清理脚本
# =============================================================================
# 清理过期的截图、旧数据快照、临时文件
# 建议通过 cron 每天凌晨 2 点运行:
#   0 2 * * * /home/<YOUR_USER>/creator/scripts/cleanup-workspace.sh >> /home/<YOUR_USER>/creator/logs/cleanup.log 2>&1
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE="$PROJECT_DIR/workspace"

echo "$(date '+%Y-%m-%d %H:%M:%S') === 开始 Workspace 清理 ==="

# ------ 1. 清理截图（7 天前）------
SCREENSHOTS_DIR="$WORKSPACE/content/screenshots"
if [ -d "$SCREENSHOTS_DIR" ]; then
  COUNT=$(find "$SCREENSHOTS_DIR" -type f -name "*.png" -o -name "*.jpg" -mtime +7 | wc -l)
  find "$SCREENSHOTS_DIR" -type f \( -name "*.png" -o -name "*.jpg" \) -mtime +7 -delete
  echo "  截图: 已清理 $COUNT 个文件（>7天）"
fi

# ------ 2. 归档旧数据快照（90 天前）------
DATA_DIR="$WORKSPACE/data"
if [ -d "$DATA_DIR" ]; then
  COUNT=$(find "$DATA_DIR" -type f -name "*.md" -mtime +90 | wc -l)
  if [ "$COUNT" -gt 0 ]; then
    ARCHIVE_DIR="$DATA_DIR/archive"
    mkdir -p "$ARCHIVE_DIR"
    find "$DATA_DIR" -maxdepth 1 -type f -name "*.md" -mtime +90 -exec mv {} "$ARCHIVE_DIR/" \;
    echo "  数据快照: 已归档 $COUNT 个文件（>90天）到 archive/"
  fi
fi

# ------ 3. 清理 Chromium 临时文件 ------
CHROME_TEMP="/tmp/.com.google.Chrome.*"
if ls $CHROME_TEMP 1> /dev/null 2>&1; then
  COUNT=$(find /tmp -maxdepth 1 -name ".com.google.Chrome.*" -mtime +1 | wc -l)
  find /tmp -maxdepth 1 -name ".com.google.Chrome.*" -mtime +1 -exec rm -rf {} + 2>/dev/null || true
  echo "  Chrome 临时: 已清理 $COUNT 个目录（>1天）"
fi

# ------ 4. 清理日志（30 天前压缩包）------
LOGS_DIR="$PROJECT_DIR/logs"
if [ -d "$LOGS_DIR" ]; then
  COUNT=$(find "$LOGS_DIR" -type f -name "*.gz" -mtime +30 | wc -l)
  find "$LOGS_DIR" -type f -name "*.gz" -mtime +30 -delete
  echo "  压缩日志: 已清理 $COUNT 个文件（>30天）"
fi

# ------ 5. 报告磁盘使用情况 ------
echo ""
echo "  磁盘使用:"
echo "    workspace/ : $(du -sh "$WORKSPACE" 2>/dev/null | cut -f1)"
echo "    logs/      : $(du -sh "$LOGS_DIR" 2>/dev/null | cut -f1 || echo '0')"
echo "    总磁盘     : $(df -h "$PROJECT_DIR" | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"

echo ""
echo "$(date '+%Y-%m-%d %H:%M:%S') === 清理完成 ==="
