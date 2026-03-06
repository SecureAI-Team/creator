import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "EDITOR", "MEMBER"]),
});

const removeMemberSchema = z.object({
  userId: z.string(),
});

async function getMembership(teamId: string, userId: string) {
  return prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
}

/**
 * PUT /api/teams/[id]/members
 * Update member role.
 */
export async function PUT(
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
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const targetMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: parsed.data.userId } },
  });

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (targetMember.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot change owner role" },
      { status: 403 }
    );
  }

  const updated = await prisma.teamMember.update({
    where: { teamId_userId: { teamId, userId: parsed.data.userId } },
    data: { role: parsed.data.role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/teams/[id]/members
 * Remove member.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await params;
  const body = await request.json();
  const parsed = removeMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const targetUserId = parsed.data.userId;
  const actorMembership = await getMembership(teamId, session.user.id);
  const targetMembership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: targetUserId } },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const isSelfRemoving = session.user.id === targetUserId;
  const isOwnerOrAdmin =
    actorMembership && (actorMembership.role === "OWNER" || actorMembership.role === "ADMIN");

  if (!isSelfRemoving && !isOwnerOrAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (targetMembership.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot remove owner - transfer ownership or delete team" },
      { status: 403 }
    );
  }

  await prisma.teamMember.delete({
    where: { teamId_userId: { teamId, userId: targetUserId } },
  });

  return NextResponse.json({ success: true });
}
