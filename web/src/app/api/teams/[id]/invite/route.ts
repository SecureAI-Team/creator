import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

const createInviteSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "EDITOR", "MEMBER"]).optional(),
});

function generateInviteCode(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

async function getMembership(teamId: string, userId: string) {
  return prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
}

/**
 * POST /api/teams/[id]/invite
 * Create invite link.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await params;
  const membership = await getMembership(teamId, session.user.id);

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createInviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = generateInviteCode(12);
    const existing = await prisma.teamInvite.findUnique({
      where: { code },
    });
    if (!existing) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    return NextResponse.json(
      { error: "Failed to generate unique invite code" },
      { status: 500 }
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.teamInvite.create({
    data: {
      teamId,
      email: parsed.data.email,
      code,
      role: parsed.data.role || "MEMBER",
      expiresAt,
    },
  });

  return NextResponse.json({
    code: invite.code,
    expiresAt: invite.expiresAt,
  });
}

/**
 * GET /api/teams/[id]/invite
 * List pending invites.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await params;
  const membership = await getMembership(teamId, session.user.id);

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await prisma.teamInvite.findMany({
    where: {
      teamId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  return NextResponse.json({ invites });
}
