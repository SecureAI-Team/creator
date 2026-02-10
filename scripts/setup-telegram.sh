#!/usr/bin/env bash
# =============================================================================
# Telegram Bot 配置向导
# =============================================================================
set -euo pipefail

echo "=== Telegram Bot 配置向导 ==="
echo ""
echo "步骤 1: 创建 Telegram Bot"
echo "  1. 在 Telegram 中搜索 @BotFather"
echo "  2. 发送 /newbot"
echo "  3. 按提示设置 Bot 名称和用户名"
echo "  4. 获得 Bot Token（格式如 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11）"
echo ""

read -p "请输入 Bot Token: " BOT_TOKEN

echo ""
echo "步骤 2: 获取你的 Telegram User ID"
echo "  1. 在 Telegram 中搜索 @userinfobot 或 @getmyid_bot"
echo "  2. 发送任意消息，获得你的 User ID（纯数字）"
echo ""

read -p "请输入你的 Telegram User ID: " USER_ID

echo ""
echo "步骤 3: 保存配置..."

# 追加到环境变量文件
cat >> ~/.env.creator << ENVEOF

# Telegram Bot 配置
export TELEGRAM_BOT_TOKEN="$BOT_TOKEN"
export TELEGRAM_USER_ID="$USER_ID"
ENVEOF

echo "已保存到 ~/.env.creator"
echo ""
echo "步骤 4: 在 OpenClaw 中启用 Telegram 渠道"
echo "  openclaw channel add telegram --token \$TELEGRAM_BOT_TOKEN"
echo ""
echo "配置完成后，重启 OpenClaw Gateway 即可通过 Telegram 与助手对话。"
echo ""
echo "=== 配置完成 ==="
