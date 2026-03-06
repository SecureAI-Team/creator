import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function escapeCSV(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * GET /api/data/export
 * Export platform metrics as CSV.
 * Query params: days (default 30), platform (optional)
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const parsed = daysParam ? parseInt(daysParam, 10) : 30;
  const days = Number.isNaN(parsed) ? 30 : Math.min(365, Math.max(1, parsed));
  const platform = searchParams.get("platform") || undefined;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const where: { userId: string; date: { gte: Date }; platform?: string } = {
    userId,
    date: { gte: since },
  };
  if (platform) {
    where.platform = platform;
  }

  const metrics = await prisma.platformMetrics.findMany({
    where,
    orderBy: [{ date: "asc" }, { platform: "asc" }, { accountId: "asc" }],
  });

  const headers = ["日期", "平台", "账号", "粉丝数", "浏览量", "点赞", "评论", "分享", "作品数"];
  const rows = metrics.map((m) => [
    m.date.toISOString().substring(0, 10),
    m.platform,
    m.accountId,
    m.followers,
    m.totalViews,
    m.totalLikes,
    m.totalComments,
    m.totalShares,
    m.contentCount,
  ]);

  const csvLines = [headers.join(","), ...rows.map((r) => r.map(escapeCSV).join(","))];
  const csvBody = csvLines.join("\r\n");
  const bom = "\uFEFF";
  const body = bom + csvBody;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=platform-data-export.csv",
    },
  });
}
