/**
 * LLM utility for generating natural language insight summaries.
 * Uses DashScope (Qwen) API with user's own API key or system default.
 */

import { prisma } from "@/lib/db";

const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1";

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * Get the DashScope API key for a user (from preferences or env).
 */
async function getApiKey(userId: string): Promise<string | null> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { dashscopeApiKey: true },
  });

  return prefs?.dashscopeApiKey || process.env.DASHSCOPE_API_KEY || null;
}

/**
 * Call DashScope chat completion API.
 */
async function chatCompletion(
  apiKey: string,
  messages: LLMMessage[],
  model = "qwen-turbo"
): Promise<string> {
  const res = await fetch(`${DASHSCOPE_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DashScope API error (${res.status}): ${err}`);
  }

  const data: LLMResponse = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Generate a natural language insight summary from structured rule results.
 */
export async function generateInsightSummary(
  userId: string,
  insights: { type: string; severity: string; platform?: string | null; message: string }[],
  metricsSnapshot?: Record<string, unknown>
): Promise<string | null> {
  const apiKey = await getApiKey(userId);
  if (!apiKey) return null;

  if (insights.length === 0) return "目前数据表现正常，暂无异常或建议。";

  const insightList = insights
    .slice(0, 20)
    .map((i, idx) => `${idx + 1}. [${i.severity}] ${i.platform ? `(${i.platform}) ` : ""}${i.message}`)
    .join("\n");

  const systemPrompt = `你是一位专业的自媒体运营分析师。请根据以下数据洞察结果，生成一份简洁的中文分析摘要（200-400字），包含：
1. 整体表现评价（一句话）
2. 最需要关注的 2-3 个问题
3. 具体可执行的改进建议
不要重复列举原始数据，用自然语言总结关键信息。`;

  let userContent = `以下是自动检测到的 ${insights.length} 条洞察：\n\n${insightList}`;
  if (metricsSnapshot) {
    userContent += `\n\n当前数据概况：${JSON.stringify(metricsSnapshot)}`;
  }

  try {
    return await chatCompletion(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ]);
  } catch (err) {
    console.error("[llm] Insight summary generation failed:", err);
    return null;
  }
}

/**
 * Generate content topic suggestions based on performance data.
 */
export async function generateTopicSuggestions(
  userId: string,
  recentTitles: string[],
  topPerformers: { title: string; views: number; likes: number }[]
): Promise<string | null> {
  const apiKey = await getApiKey(userId);
  if (!apiKey) return null;

  const systemPrompt = `你是一位自媒体内容策划专家。根据创作者最近的内容表现数据，推荐 5 个新选题方向。每个选题包含：标题建议、推荐理由、预计适合的平台。用中文回答。`;

  const userContent = `最近发布的内容标题：\n${recentTitles.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n表现最好的内容：\n${topPerformers.slice(0, 5).map((t, i) => `${i + 1}. "${t.title}" — ${t.views}次浏览, ${t.likes}次点赞`).join("\n")}`;

  try {
    return await chatCompletion(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ]);
  } catch (err) {
    console.error("[llm] Topic suggestion generation failed:", err);
    return null;
  }
}
