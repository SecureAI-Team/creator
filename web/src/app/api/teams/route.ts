import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

const createTeamSchema = z.object({
  name: z.string().min(1),
});

function generateInviteCode(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

/**
 * GET /api/teams
 * List teams the current user belongs to.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { members: true },
          },
        },
      },
    },
  });

  const teams = memberships.map((m) => ({
    id: m.team.id,
    name: m.team.name,
    role: m.role,
    memberCount: m.team._count.members,
    owner: m.team.owner,
  }));

  return NextResponse.json({ teams });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * POST /api/teams
 * Create a new team.
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json();
  const parsed = createTeamSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let inviteCode: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    inviteCode = generateInviteCode(8);
    const existing = await prisma.team.findUnique({
      where: { inviteCode },
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

  const team = await prisma.team.create({
    data: {
      name: parsed.data.name,
      ownerId: userId,
      inviteCode,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(team, { status: 201 });
}) as unknown as (req: Request) => Promise<Response>;
