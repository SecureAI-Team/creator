import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  isWeChatNotifyEnabled,
  notifyDailyReport,
  notifyAnomalyAlert,
  type NotifyConfig,
} from "@/lib/wechat-notify";

/**
 * GET /api/notify
 * Check notification status and config.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  // Check for WeChat OAuth binding (stored in Account table with provider = "wechat")
  const wechatAccount = await prisma.account.findFirst({
    where: { userId, provider: "wechat" },
    select: { providerAccountId: true },
  });

  return NextResponse.json({
    wechatEnabled: isWeChatNotifyEnabled(),
    wechatBound: !!wechatAccount,
    openId: wechatAccount?.providerAccountId || null,
    userName: user?.name || null,
  });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * POST /api/notify
 * Manually trigger a notification.
 * Body: { type: "daily_report" | "anomaly_test" }
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json().catch(() => ({}));
  const type = (body as Record<string, string>).type;

  if (!isWeChatNotifyEnabled()) {
    return NextResponse.json({ error: "WeChat notification not configured" }, { status: 400 });
  }

  const wechatAccount = await prisma.account.findFirst({
    where: { userId, provider: "wechat" },
    select: { providerAccountId: true },
  });

  if (!wechatAccount) {
    return NextResponse.json({ error: "WeChat account not bound" }, { status: 400 });
  }

  const config: NotifyConfig = {
    openId: wechatAccount.providerAccountId,
    baseUrl: process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL,
  };

  if (type === "daily_report") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metrics = await prisma.platformMetrics.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      distinct: ["platform", "accountId"],
    });

    const totalFollowers = metrics.reduce((s, m) => s + m.followers, 0);
    const totalViews = metrics.reduce((s, m) => s + m.totalViews, 0);

    // Compute follower change vs yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayMetrics = await prisma.platformMetrics.findMany({
      where: { userId, date: yesterday },
    });
    const yesterdayFollowers = yesterdayMetrics.reduce((s, m) => s + m.followers, 0);

    const sent = await notifyDailyReport(config, {
      date: today.toISOString().substring(0, 10),
      totalFollowers,
      followerChange: totalFollowers - yesterdayFollowers,
      totalViews,
      platformCount: new Set(metrics.map((m) => m.platform)).size,
    });

    return NextResponse.json({ sent });
  }

  if (type === "anomaly_test") {
    const sent = await notifyAnomalyAlert(config, {
      platform: "测试平台",
      type: "测试告警",
      message: "这是一条测试异常告警通知",
    });

    return NextResponse.json({ sent });
  }

  return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
}) as unknown as (req: Request) => Promise<Response>;
