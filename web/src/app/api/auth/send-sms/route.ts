import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const smsSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效手机号"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = smsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { phone } = parsed.data;

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store verification token
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: `phone:${phone}`,
          token: code,
        },
      },
      update: { token: code, expires },
      create: {
        identifier: `phone:${phone}`,
        token: code,
        expires,
      },
    });

    // Send SMS via Aliyun
    if (
      process.env.ALIYUN_SMS_ACCESS_KEY_ID &&
      process.env.ALIYUN_SMS_ACCESS_KEY_SECRET
    ) {
      // TODO: Integrate Aliyun SMS SDK
      // For now, log the code in development
      console.log(`[SMS] Phone: ${phone}, Code: ${code}`);
    } else {
      // Development mode: log code
      console.log(`[SMS DEV] Phone: ${phone}, Code: ${code}`);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "发送失败，请稍后重试" },
      { status: 500 }
    );
  }
}
