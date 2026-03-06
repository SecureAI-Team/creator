/**
 * WeChat Service Account Template Message Push
 *
 * Sends notifications via WeChat Official Account template messages.
 * Requires:
 *   - WECHAT_APP_ID and WECHAT_APP_SECRET env vars
 *   - User must have bound their WeChat openId via OAuth
 *
 * Template message API:
 *   POST https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=TOKEN
 */

const WECHAT_APP_ID = process.env.WECHAT_APP_ID || "";
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || "";
const WECHAT_API_BASE = "https://api.weixin.qq.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  try {
    const url = `${WECHAT_API_BASE}/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`;
    const res = await fetch(url);
    const data = (await res.json()) as { access_token?: string; expires_in?: number; errcode?: number };

    if (data.access_token) {
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
      };
      return data.access_token;
    }

    console.error("[wechat-notify] Failed to get access_token:", data);
    return null;
  } catch (err) {
    console.error("[wechat-notify] getAccessToken error:", err);
    return null;
  }
}

interface TemplateData {
  [key: string]: { value: string; color?: string };
}

async function sendTemplateMessage(
  openId: string,
  templateId: string,
  data: TemplateData,
  url?: string
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const apiUrl = `${WECHAT_API_BASE}/cgi-bin/message/template/send?access_token=${token}`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: openId,
        template_id: templateId,
        url: url || "",
        data,
      }),
    });

    const result = (await res.json()) as { errcode?: number; errmsg?: string };
    if (result.errcode && result.errcode !== 0) {
      console.error("[wechat-notify] Send failed:", result);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[wechat-notify] sendTemplateMessage error:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// High-level notification helpers
// ---------------------------------------------------------------------------

export interface NotifyConfig {
  openId: string;
  baseUrl?: string;
}

/**
 * Template IDs - these must be configured on the WeChat MP admin console.
 * Store as env vars or in a config table; defaults here are placeholders.
 */
const TEMPLATE_IDS = {
  dailyReport: process.env.WECHAT_TPL_DAILY_REPORT || "",
  publishResult: process.env.WECHAT_TPL_PUBLISH_RESULT || "",
  anomalyAlert: process.env.WECHAT_TPL_ANOMALY_ALERT || "",
};

export async function notifyDailyReport(
  config: NotifyConfig,
  report: {
    date: string;
    totalFollowers: number;
    followerChange: number;
    totalViews: number;
    platformCount: number;
  }
): Promise<boolean> {
  if (!TEMPLATE_IDS.dailyReport) return false;

  return sendTemplateMessage(
    config.openId,
    TEMPLATE_IDS.dailyReport,
    {
      first: { value: `${report.date} 创作日报`, color: "#173177" },
      keyword1: { value: `${report.totalFollowers.toLocaleString()}`, color: "#333333" },
      keyword2: { value: `${report.followerChange >= 0 ? "+" : ""}${report.followerChange.toLocaleString()}`, color: report.followerChange >= 0 ? "#07C160" : "#E6162D" },
      keyword3: { value: `${report.totalViews.toLocaleString()}`, color: "#333333" },
      keyword4: { value: `${report.platformCount} 个平台`, color: "#333333" },
      remark: { value: "点击查看详细数据", color: "#999999" },
    },
    config.baseUrl ? `${config.baseUrl}/data` : undefined
  );
}

export async function notifyPublishResult(
  config: NotifyConfig,
  result: {
    title: string;
    platform: string;
    success: boolean;
    error?: string;
  }
): Promise<boolean> {
  if (!TEMPLATE_IDS.publishResult) return false;

  return sendTemplateMessage(
    config.openId,
    TEMPLATE_IDS.publishResult,
    {
      first: { value: result.success ? "内容发布成功" : "内容发布失败", color: result.success ? "#07C160" : "#E6162D" },
      keyword1: { value: result.title.slice(0, 30), color: "#333333" },
      keyword2: { value: result.platform, color: "#333333" },
      keyword3: { value: result.success ? "已发布" : "发布失败", color: result.success ? "#07C160" : "#E6162D" },
      remark: { value: result.error || "点击查看详情", color: "#999999" },
    },
    config.baseUrl ? `${config.baseUrl}/content` : undefined
  );
}

export async function notifyAnomalyAlert(
  config: NotifyConfig,
  alert: {
    platform: string;
    type: string;
    message: string;
  }
): Promise<boolean> {
  if (!TEMPLATE_IDS.anomalyAlert) return false;

  return sendTemplateMessage(
    config.openId,
    TEMPLATE_IDS.anomalyAlert,
    {
      first: { value: "数据异常告警", color: "#E6162D" },
      keyword1: { value: alert.platform, color: "#333333" },
      keyword2: { value: alert.type, color: "#E6162D" },
      keyword3: { value: alert.message.slice(0, 60), color: "#333333" },
      remark: { value: "请及时处理", color: "#999999" },
    },
    config.baseUrl ? `${config.baseUrl}/data` : undefined
  );
}

/**
 * Check if WeChat notification is configured and ready.
 */
export function isWeChatNotifyEnabled(): boolean {
  return !!(WECHAT_APP_ID && WECHAT_APP_SECRET);
}
