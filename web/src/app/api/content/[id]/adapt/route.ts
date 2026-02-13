import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Platform format rules.
 * Defines title/body length limits and formatting guidelines for each platform.
 */
const PLATFORM_RULES: Record<string, {
  name: string;
  titleLimit: number;
  bodyLimit: number;
  tagLimit: number;
  tips: string;
}> = {
  bilibili: {
    name: "哔哩哔哩",
    titleLimit: 80,
    bodyLimit: 2000,
    tagLimit: 12,
    tips: "标题应吸引眼球，简介可用 emoji。标签选择热门话题。",
  },
  douyin: {
    name: "抖音",
    titleLimit: 55,
    bodyLimit: 300,
    tagLimit: 5,
    tips: "标题要简短有力。#话题标签 放在描述中。适合口语化表达。",
  },
  xiaohongshu: {
    name: "小红书",
    titleLimit: 20,
    bodyLimit: 1000,
    tagLimit: 10,
    tips: "标题用 emoji 开头更吸引。正文分段，每段不超 3 行。话题用 # 标记。",
  },
  youtube: {
    name: "YouTube",
    titleLimit: 100,
    bodyLimit: 5000,
    tagLimit: 15,
    tips: "Title in English or bilingual. Description should include timestamps and links.",
  },
  "weixin-mp": {
    name: "微信公众号",
    titleLimit: 64,
    bodyLimit: 20000,
    tagLimit: 0,
    tips: "标题要引发好奇。正文可长，排版注意加粗和分段。",
  },
  "weixin-channels": {
    name: "微信视频号",
    titleLimit: 150,
    bodyLimit: 1000,
    tagLimit: 5,
    tips: "描述配合 #话题 使用，简洁有力。",
  },
  kuaishou: {
    name: "快手",
    titleLimit: 50,
    bodyLimit: 300,
    tagLimit: 5,
    tips: "接地气的表达更受欢迎。",
  },
  zhihu: {
    name: "知乎",
    titleLimit: 100,
    bodyLimit: 10000,
    tagLimit: 5,
    tips: "专业、有深度的内容更受欢迎。可加入数据和引用。",
  },
  weibo: {
    name: "微博",
    titleLimit: 0,
    bodyLimit: 2000,
    tagLimit: 3,
    tips: "微博没有标题。#话题# 格式（前后都有#）。配合@相关账号。",
  },
  toutiao: {
    name: "头条号",
    titleLimit: 30,
    bodyLimit: 10000,
    tagLimit: 5,
    tips: "标题要体现信息量，正文层次分明。",
  },
};

/**
 * POST /api/content/[id]/adapt
 * Adapt content for a specific platform using AI text generation.
 *
 * Body: { platform: "bilibili" }
 *
 * Uses the agent bridge to send an adaptation prompt.
 * Returns adapted title, body, and tags.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: contentId } = await params;
    const { platform } = await request.json();

    if (!platform || !PLATFORM_RULES[platform]) {
      return NextResponse.json(
        { error: "不支持的平台", supportedPlatforms: Object.keys(PLATFORM_RULES) },
        { status: 400 }
      );
    }

    const content = await prisma.contentItem.findFirst({
      where: { id: contentId, userId },
    });

    if (!content) {
      return NextResponse.json({ error: "内容不存在" }, { status: 404 });
    }

    const rules = PLATFORM_RULES[platform];

    // Build the adaptation prompt
    const prompt = `你是一个内容适配助手。请将以下内容适配为 ${rules.name} 的格式。

原始内容:
标题: ${content.title}
正文: ${content.body || "(无正文)"}
标签: ${(content.tags || []).join(", ") || "(无标签)"}
类型: ${content.contentType}

${rules.name} 的要求:
- 标题长度限制: ${rules.titleLimit > 0 ? `${rules.titleLimit} 字` : "无标题"}
- 正文长度限制: ${rules.bodyLimit} 字
- 标签数量限制: ${rules.tagLimit} 个
- 风格建议: ${rules.tips}

请按以下 JSON 格式输出适配后的内容，不要输出其他内容:
{
  "title": "适配后的标题",
  "body": "适配后的正文",
  "tags": ["标签1", "标签2"]
}`;

    // Use the agent API directly (server-side sendMessage)
    const { sendMessage } = await import("@/lib/openclaw");
    let reply: string;
    try {
      reply = await sendMessage(userId, prompt);
    } catch {
      // If bridge/OpenClaw is unavailable, try to do simple truncation locally
      const adaptedTitle = rules.titleLimit > 0
        ? content.title.substring(0, rules.titleLimit)
        : content.title;
      const adaptedBody = (content.body || "").substring(0, rules.bodyLimit);
      const adaptedTags = (content.tags || []).slice(0, rules.tagLimit || 5);

      return NextResponse.json({
        platform,
        rules,
        adapted: {
          title: adaptedTitle,
          body: adaptedBody,
          tags: adaptedTags,
        },
        method: "truncation",
        note: "AI 不可用，已使用简单截断适配",
      });
    }

    // Try to parse the AI response as JSON
    let adapted;
    try {
      // Extract JSON from the reply (AI might wrap it in markdown code blocks)
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        adapted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in reply");
      }
    } catch {
      // If parsing fails, return the raw reply
      return NextResponse.json({
        platform,
        rules,
        adapted: null,
        rawReply: reply,
        method: "ai_raw",
        note: "AI 返回结果解析失败，请参考原始回复手动调整",
      });
    }

    // Enforce limits on AI output
    if (adapted.title && rules.titleLimit > 0) {
      adapted.title = adapted.title.substring(0, rules.titleLimit);
    }
    if (adapted.body) {
      adapted.body = adapted.body.substring(0, rules.bodyLimit);
    }
    if (adapted.tags && rules.tagLimit > 0) {
      adapted.tags = adapted.tags.slice(0, rules.tagLimit);
    }

    return NextResponse.json({
      platform,
      rules,
      adapted,
      method: "ai",
    });
  } catch (error) {
    console.error("[adapt] Error:", error);
    return NextResponse.json(
      { error: "适配失败" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/content/[id]/adapt
 * Get platform format rules (no AI involved).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // consume params
  return NextResponse.json({ rules: PLATFORM_RULES });
}
