import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/platforms/:platform/account
 * Update group / labels / accountName for a platform connection.
 *
 * Body: { accountId?: string, group?: string | null, labels?: string[], accountName?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { platform } = await params;
  const body = await request.json();
  const accountId = body.accountId || "default";

  const conn = await prisma.platformConnection.findUnique({
    where: {
      userId_platformKey_accountId: {
        userId: session.user.id,
        platformKey: platform,
        accountId,
      },
    },
  });

  if (!conn) {
    return NextResponse.json({ error: "平台连接不存在" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if ("group" in body) updateData.group = body.group || null;
  if ("labels" in body) updateData.labels = Array.isArray(body.labels) ? body.labels : [];
  if ("accountName" in body) updateData.accountName = body.accountName || null;

  const updated = await prisma.platformConnection.update({
    where: { id: conn.id },
    data: updateData,
    select: {
      platformKey: true,
      accountId: true,
      accountName: true,
      group: true,
      labels: true,
    },
  });

  return NextResponse.json(updated);
}
