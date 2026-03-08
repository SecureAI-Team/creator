import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AuditAction =
  | "login"
  | "content_create"
  | "content_update"
  | "content_delete"
  | "publish"
  | "data_refresh"
  | "insight_generate"
  | "platform_connect"
  | "platform_disconnect"
  | "comment_reply";

interface AuditOptions {
  userId: string;
  action: AuditAction;
  target?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/**
 * Fire-and-forget audit log entry.
 * Failures are silently swallowed so they never break the main flow.
 */
export function audit(opts: AuditOptions): void {
  prisma.auditLog
    .create({
      data: {
        userId: opts.userId,
        action: opts.action,
        target: opts.target ?? null,
        metadata: (opts.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: opts.ip ?? null,
      },
    })
    .catch(() => {});
}
