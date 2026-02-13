import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/accounts
 * List all platform accounts for the current user.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.platformConnection.findMany({
    where: { userId: req.auth.user.id },
    select: {
      id: true,
      platformKey: true,
      accountId: true,
      accountName: true,
      status: true,
      lastChecked: true,
      createdAt: true,
    },
    orderBy: [{ platformKey: "asc" }, { accountId: "asc" }],
  });

  return NextResponse.json({ accounts });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * POST /api/accounts
 * Add a new platform account.
 * Body: { platformKey: "weixin-mp", accountId: "geo-radar", accountName: "GEO雷达" }
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json().catch(() => ({}));
  const { platformKey, accountId, accountName } = body as {
    platformKey?: string;
    accountId?: string;
    accountName?: string;
  };

  if (!platformKey || !accountId) {
    return NextResponse.json(
      { error: "platformKey and accountId are required" },
      { status: 400 }
    );
  }

  // Validate accountId format (alphanumeric, dashes, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(accountId)) {
    return NextResponse.json(
      { error: "accountId must be alphanumeric (a-z, 0-9, -, _)" },
      { status: 400 }
    );
  }

  try {
    const account = await prisma.platformConnection.upsert({
      where: {
        userId_platformKey_accountId: {
          userId,
          platformKey,
          accountId,
        },
      },
      update: {
        accountName: accountName || accountId,
      },
      create: {
        userId,
        platformKey,
        accountId,
        accountName: accountName || accountId,
        status: "DISCONNECTED",
      },
    });

    return NextResponse.json({ account });
  } catch (err) {
    console.error("[accounts] Create error:", err);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}) as unknown as (req: Request) => Promise<Response>;

/**
 * DELETE /api/accounts
 * Remove a platform account.
 * Body: { platformKey: "weixin-mp", accountId: "geo-radar" }
 */
export const DELETE = auth(async function DELETE(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json().catch(() => ({}));
  const { platformKey, accountId } = body as {
    platformKey?: string;
    accountId?: string;
  };

  if (!platformKey || !accountId) {
    return NextResponse.json(
      { error: "platformKey and accountId are required" },
      { status: 400 }
    );
  }

  // Don't allow deleting the "default" account
  if (accountId === "default") {
    return NextResponse.json(
      { error: "Cannot delete the default account" },
      { status: 400 }
    );
  }

  try {
    await prisma.platformConnection.deleteMany({
      where: { userId, platformKey, accountId },
    });

    // Also delete associated metrics
    await prisma.platformMetrics.deleteMany({
      where: { userId, platform: platformKey, accountId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[accounts] Delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}) as unknown as (req: Request) => Promise<Response>;
