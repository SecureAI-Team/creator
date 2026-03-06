import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const joinSchema = z.object({
  code: z.string().min(1),
});

/**
 * POST /api/teams/join
 * Join team via invite code.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = joinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const invite = await prisma.teamInvite.findUnique({
    where: { code: parsed.data.code },
    include: { team: true },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid or expired invite code" }, { status: 404 });
  }

  if (invite.usedAt) {
    return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  const existingMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: invite.teamId, userId: session.user.id } },
  });

  if (existingMember) {
    return NextResponse.json(
      { error: "Already a member of this team", team: invite.team },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.teamMember.create({
      data: {
        teamId: invite.teamId,
        userId: session.user.id,
        role: invite.role,
      },
    }),
    prisma.teamInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  const team = await prisma.team.findUnique({
    where: { id: invite.teamId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json({
    success: true,
    team,
  });
}
