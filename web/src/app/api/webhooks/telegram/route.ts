import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/openclaw";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3001";

/**
 * Telegram Webhook - Multi-user routing
 *
 * POST /api/webhooks/telegram
 *
 * Flow:
 * 1. Receive message from Telegram
 * 2. Look up user by Telegram ID in telegram_bindings
 * 3. If bound: route message to user's OpenClaw instance
 * 4. If unbound: check for bind code, or send registration link
 */

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    const message = update.message;

    if (!message?.text || !message?.from?.id) {
      return NextResponse.json({ ok: true });
    }

    const telegramUserId = String(message.from.id);
    const chatId = message.chat.id;
    const text = message.text.trim();

    // Check if user is bound
    const binding = await prisma.telegramBinding.findUnique({
      where: { telegramUserId },
      include: { user: true },
    });

    if (binding) {
      // Route to user's OpenClaw instance
      try {
        const reply = await sendMessage(binding.userId, text);
        await sendTelegramMessage(chatId, reply || "处理完成");
      } catch {
        await sendTelegramMessage(chatId, "AI 助手暂时不可用，请稍后重试。");
      }
    } else if (text.startsWith("/bind ")) {
      // Handle bind code
      const bindCode = text.replace("/bind ", "").trim();
      await handleBindCode(chatId, telegramUserId, message.from.username, bindCode);
    } else if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        `欢迎使用创作助手！🎨\n\n` +
          `请先在网页端注册并获取绑定码：\n${APP_URL}/register\n\n` +
          `获取绑定码后，发送：\n/bind <你的绑定码>`
      );
    } else {
      await sendTelegramMessage(
        chatId,
        `你的 Telegram 账号尚未绑定。\n\n` +
          `请访问 ${APP_URL}/settings 获取绑定码，然后发送：\n/bind <绑定码>`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Telegram Webhook] Error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

async function handleBindCode(
  chatId: number,
  telegramUserId: string,
  telegramUsername: string | undefined,
  bindCode: string
) {
  // Find binding with this code
  const pending = await prisma.telegramBinding.findFirst({
    where: {
      bindCode,
      bindCodeExpiry: { gt: new Date() },
      telegramUserId: "", // Unbound placeholder
    },
  });

  if (!pending) {
    await sendTelegramMessage(
      chatId,
      "绑定码无效或已过期。请在网页端重新生成。"
    );
    return;
  }

  // Complete binding
  await prisma.telegramBinding.update({
    where: { id: pending.id },
    data: {
      telegramUserId,
      telegramUsername,
      bindCode: null,
      bindCodeExpiry: null,
      boundAt: new Date(),
    },
  });

  await sendTelegramMessage(
    chatId,
    "绑定成功！🎉\n\n现在你可以直接在这里与 AI 助手对话了。\n发送 /help 查看可用命令。"
  );
}

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;

  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    }
  );
}
