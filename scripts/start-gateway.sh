#!/usr/bin/env bash
# =============================================================================
# 启动 OpenClaw Gateway
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 加载环境变量
if [ -f ~/.env.creator ]; then
  source ~/.env.creator
fi

# 检查 API Key
if [ -z "${DASHSCOPE_API_KEY:-}" ]; then
  echo "错误: DASHSCOPE_API_KEY 未设置"
  echo "请编辑 ~/.env.creator 并 source 它"
  exit 1
fi

echo "启动 OpenClaw Gateway..."
echo "  项目目录: $PROJECT_DIR"
echo "  模型: dashscope/qwen-max"

cd "$PROJECT_DIR"
openclaw start
