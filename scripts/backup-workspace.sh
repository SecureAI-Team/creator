#!/usr/bin/env bash
# =============================================================================
# Workspace 备份脚本
# =============================================================================
# 备份配置、草稿、发布记录等关键数据到本地归档目录
# 建议通过 cron 每天凌晨 3 点运行:
#   0 3 * * * /home/<YOUR_USER>/creator/scripts/backup-workspace.sh >> /home/<YOUR_USER>/creator/logs/backup.log 2>&1
#
# 可选：上传到阿里云 OSS（需安装 ossutil）
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_BASE="$PROJECT_DIR/backups"
DATE=$(date '+%Y%m%d')
BACKUP_DIR="$BACKUP_BASE/$DATE"
BACKUP_FILE="$BACKUP_BASE/creator-backup-$DATE.tar.gz"

echo "$(date '+%Y-%m-%d %H:%M:%S') === 开始备份 ==="

mkdir -p "$BACKUP_DIR"

# ------ 1. 备份配置文件 ------
echo "  备份配置..."
cp -r "$PROJECT_DIR/workspace/config" "$BACKUP_DIR/config"
cp "$PROJECT_DIR/openclaw.json" "$BACKUP_DIR/"
cp "$PROJECT_DIR/SOUL.md" "$BACKUP_DIR/"
cp "$PROJECT_DIR/IDENTITY.md" "$BACKUP_DIR/"
cp "$PROJECT_DIR/AGENTS.md" "$BACKUP_DIR/"

# ------ 2. 备份创作内容（草稿 + 适配 + 发布记录）------
echo "  备份创作内容..."
mkdir -p "$BACKUP_DIR/content"
cp -r "$PROJECT_DIR/workspace/content/drafts" "$BACKUP_DIR/content/" 2>/dev/null || true
cp -r "$PROJECT_DIR/workspace/content/adapted" "$BACKUP_DIR/content/" 2>/dev/null || true
cp -r "$PROJECT_DIR/workspace/content/published" "$BACKUP_DIR/content/" 2>/dev/null || true
# 注意：media/ 文件较大，可选备份
# cp -r "$PROJECT_DIR/workspace/content/media" "$BACKUP_DIR/content/" 2>/dev/null || true

# ------ 3. 备份选题库和数据 ------
echo "  备份选题和数据..."
cp -r "$PROJECT_DIR/workspace/topics" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$PROJECT_DIR/workspace/data" "$BACKUP_DIR/" 2>/dev/null || true

# ------ 4. 备份认证状态记录 ------
echo "  备份认证状态..."
cp -r "$PROJECT_DIR/workspace/auth" "$BACKUP_DIR/" 2>/dev/null || true

# ------ 5. 打包压缩 ------
echo "  压缩归档..."
tar -czf "$BACKUP_FILE" -C "$BACKUP_BASE" "$DATE"
rm -rf "$BACKUP_DIR"

# ------ 6. 清理旧备份（保留 7 天日备份）------
find "$BACKUP_BASE" -name "creator-backup-*.tar.gz" -mtime +7 -delete
echo "  已清理 7 天前的旧备份"

# ------ 7. 可选：上传到阿里云 OSS ------
# 如需上传，取消注释以下行并配置 ossutil:
# if command -v ossutil &> /dev/null; then
#   ossutil cp "$BACKUP_FILE" oss://your-bucket/creator-backups/ --force
#   echo "  已上传到 OSS"
# fi

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo ""
echo "  备份文件: $BACKUP_FILE ($BACKUP_SIZE)"
echo "$(date '+%Y-%m-%d %H:%M:%S') === 备份完成 ==="
