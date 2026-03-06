/**
 * Quota enforcement utilities.
 * Check and record usage against subscription limits.
 */

import { prisma } from "@/lib/db";

type QuotaAction = "content_create" | "ai_call" | "data_refresh" | "publish";

const ACTION_LIMIT_MAP: Record<QuotaAction, string> = {
  content_create: "maxContentPerDay",
  ai_call: "maxAiCallsPerDay",
  data_refresh: "maxContentPerDay",
  publish: "maxContentPerDay",
};

interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
}

/**
 * Check if a user has quota remaining for an action.
 * Does NOT increment usage — call recordUsage separately after the action succeeds.
 */
export async function checkQuota(
  userId: string,
  action: QuotaAction
): Promise<QuotaCheckResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  // No subscription = FREE tier defaults
  const limitKey = ACTION_LIMIT_MAP[action];
  const limit = (subscription as Record<string, unknown>)?.[limitKey] as number ?? 5;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await prisma.usageRecord.findUnique({
    where: { userId_date_action: { userId, date: today, action } },
  });

  const used = record?.count ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    used,
  };
}

/**
 * Record usage for an action (increment today's count by 1).
 */
export async function recordUsage(
  userId: string,
  action: QuotaAction,
  count = 1
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.usageRecord.upsert({
    where: { userId_date_action: { userId, date: today, action } },
    update: { count: { increment: count } },
    create: { userId, date: today, action, count },
  });
}

/**
 * Check platform count quota.
 */
export async function checkPlatformQuota(userId: string): Promise<QuotaCheckResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { maxPlatforms: true },
  });

  const limit = subscription?.maxPlatforms ?? 3;
  const used = await prisma.platformConnection.count({
    where: { userId, status: "CONNECTED" },
  });

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
    used,
  };
}

/**
 * Check team member quota.
 */
export async function checkTeamQuota(userId: string, teamId: string): Promise<QuotaCheckResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { maxTeamMembers: true },
  });

  const limit = subscription?.maxTeamMembers ?? 1;
  const used = await prisma.teamMember.count({ where: { teamId } });

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
    used,
  };
}
