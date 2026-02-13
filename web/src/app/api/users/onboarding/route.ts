import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const onboardingSchema = z.object({
  platforms: z.array(z.string()),
  tools: z.array(z.string()),
  timezone: z.string().default("Asia/Shanghai"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const { platforms, tools, timezone } = parsed.data;
    const userId = session.user.id;

    // Create user preferences
    await prisma.userPreferences.upsert({
      where: { userId },
      update: { timezone },
      create: { userId, timezone },
    });

    // Create platform connections
    for (const platformKey of platforms) {
      await prisma.platformConnection.upsert({
        where: {
          userId_platformKey_accountId: { userId, platformKey, accountId: "default" },
        },
        update: {},
        create: { userId, platformKey, accountId: "default" },
      });
    }

    // Create tool configs
    for (const toolKey of tools) {
      await prisma.toolConfig.upsert({
        where: {
          userId_toolKey: { userId, toolKey },
        },
        update: { enabled: true },
        create: { userId, toolKey, enabled: true },
      });
    }

    // Mark user as onboarded
    await prisma.user.update({
      where: { id: userId },
      data: { onboarded: true },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "初始化失败" },
      { status: 500 }
    );
  }
}
