import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { randomBytes } from "crypto";

/**
 * POST /api/mobile/auth
 * Authenticate mobile mini-program users.
 * Body: { phone, password } or { token } for token refresh.
 * Returns a bearer token for API access.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { phone, password, token } = body as {
    phone?: string;
    password?: string;
    token?: string;
  };

  // Token refresh
  if (token) {
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    return NextResponse.json({
      user: session.user,
      token: session.sessionToken,
    });
  }

  // Phone + password login
  if (!phone || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, name: true, phone: true, password: true },
  });

  if (!user || !user.password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Create session token
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, phone: user.phone },
    token: sessionToken,
  });
}
