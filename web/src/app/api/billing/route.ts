import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const PLAN_DEFAULTS: Record<string, {
  maxPlatforms: number;
  maxContentPerDay: number;
  maxAiCallsPerDay: number;
  maxStorageMb: number;
  maxTeamMembers: number;
  historyRetentionDays: number;
  advancedInsights: boolean;
  benchmarkAccess: boolean;
}> = {
  FREE: {
    maxPlatforms: 3,
    maxContentPerDay: 5,
    maxAiCallsPerDay: 20,
    maxStorageMb: 500,
    maxTeamMembers: 1,
    historyRetentionDays: 30,
    advancedInsights: false,
    benchmarkAccess: false,
  },
  BASIC: {
    maxPlatforms: 6,
    maxContentPerDay: 20,
    maxAiCallsPerDay: 100,
    maxStorageMb: 2000,
    maxTeamMembers: 3,
    historyRetentionDays: 90,
    advancedInsights: true,
    benchmarkAccess: false,
  },
  PRO: {
    maxPlatforms: 15,
    maxContentPerDay: 100,
    maxAiCallsPerDay: 500,
    maxStorageMb: 10000,
    maxTeamMembers: 10,
    historyRetentionDays: 365,
    advancedInsights: true,
    benchmarkAccess: true,
  },
  ENTERPRISE: {
    maxPlatforms: 100,
    maxContentPerDay: 1000,
    maxAiCallsPerDay: 5000,
    maxStorageMb: 100000,
    maxTeamMembers: 100,
    historyRetentionDays: 730,
    advancedInsights: true,
    benchmarkAccess: true,
  },
};

/**
 * GET /api/billing
 * Get current subscription status and usage.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;

  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  // Auto-create FREE subscription if none exists
  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: { userId, plan: "FREE", ...PLAN_DEFAULTS.FREE },
    });
  }

  // Get today's usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usage = await prisma.usageRecord.findMany({
    where: { userId, date: today },
  });

  const usageSummary: Record<string, number> = {};
  for (const u of usage) {
    usageSummary[u.action] = (usageSummary[u.action] || 0) + u.count;
  }

  // Platform count
  const platformCount = await prisma.platformConnection.count({
    where: { userId, status: "CONNECTED" },
  });

  return NextResponse.json({
    subscription: {
      plan: subscription.plan,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      limits: {
        maxPlatforms: subscription.maxPlatforms,
        maxContentPerDay: subscription.maxContentPerDay,
        maxAiCallsPerDay: subscription.maxAiCallsPerDay,
        maxStorageMb: subscription.maxStorageMb,
        maxTeamMembers: subscription.maxTeamMembers,
        historyRetentionDays: subscription.historyRetentionDays,
        advancedInsights: subscription.advancedInsights,
        benchmarkAccess: subscription.benchmarkAccess,
      },
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
    usage: usageSummary,
    platformCount,
    plans: Object.entries(PLAN_DEFAULTS).map(([tier, limits]) => ({
      tier,
      ...limits,
    })),
  });
}) as unknown as (req: Request) => Promise<Response>;

/**
 * POST /api/billing
 * Update subscription plan (for self-service upgrade/downgrade).
 * Body: { plan: "BASIC" | "PRO" | ... }
 */
export const POST = auth(async function POST(req) {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const body = await req.json().catch(() => ({}));
  const plan = (body as Record<string, string>).plan;

  if (!plan || !PLAN_DEFAULTS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const defaults = PLAN_DEFAULTS[plan];
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: plan as "FREE" | "BASIC" | "PRO" | "ENTERPRISE",
      status: "active",
      ...defaults,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    create: {
      userId,
      plan: plan as "FREE" | "BASIC" | "PRO" | "ENTERPRISE",
      status: "active",
      ...defaults,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  return NextResponse.json({ success: true, subscription });
}) as unknown as (req: Request) => Promise<Response>;
