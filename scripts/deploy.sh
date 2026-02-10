#!/usr/bin/env bash
# =============================================================================
# 部署更新脚本
# =============================================================================
# 从 Git 拉取最新代码，重启 Gateway，验证健康状态
#
# 用法:
#   bash scripts/deploy.sh              # 常规更新
#   bash scripts/deploy.sh --force      # 强制更新（丢弃本地变更）
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FORCE_MODE="${1:-}"

cd "$PROJECT_DIR"

echo "$(date '+%Y-%m-%d %H:%M:%S') === 开始部署 ==="

# ------ 1. 预备份 ------
echo "[1/5] 备份当前配置..."
bash "$SCRIPT_DIR/backup-workspace.sh" || echo "  ⚠️ 备份失败，继续部署"

# ------ 2. 拉取最新代码 ------
echo "[2/5] 拉取最新代码..."
if [ "$FORCE_MODE" = "--force" ]; then
  echo "  强制模式：丢弃本地变更"
  git fetch origin
  git reset --hard origin/main
else
  # 正常模式：保留本地 workspace 变更
  git stash --include-untracked 2>/dev/null || true
  git pull origin main
  git stash pop 2>/dev/null || true
fi

# ------ 3. 安装依赖（如有变更）------
echo "[3/5] 检查依赖..."
if [ -f "package.json" ]; then
  npm install --production 2>/dev/null || true
fi

# ------ 4. 重启服务 ------
echo "[4/5] 重启 Gateway..."
if systemctl is-active openclaw > /dev/null 2>&1; then
  sudo systemctl restart openclaw
  echo "  systemd: openclaw 已重启"
elif command -v pm2 &> /dev/null && pm2 describe openclaw > /dev/null 2>&1; then
  pm2 restart openclaw
  echo "  pm2: openclaw 已重启"
else
  echo "  ⚠️ 未检测到进程管理器，请手动重启: openclaw start"
fi

# ------ 5. 健康检查 ------
echo "[5/5] 健康检查..."
sleep 5

HEALTHY=false
for i in 1 2 3; do
  if pgrep -f "openclaw" > /dev/null 2>&1; then
    HEALTHY=true
    break
  fi
  echo "  等待启动... ($i/3)"
  sleep 3
done

if [ "$HEALTHY" = true ]; then
  echo ""
  echo "✅ 部署成功 — Gateway 运行正常"
  echo "$(date '+%Y-%m-%d %H:%M:%S') === 部署完成 ==="
else
  echo ""
  echo "❌ 部署可能失败 — Gateway 未检测到运行"
  echo "请检查日志: journalctl -u openclaw -n 50 --no-pager"
  exit 1
fi
