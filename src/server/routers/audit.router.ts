import { z } from "zod";
import { adminProc, router } from "../trpc";
import { prisma } from "../../../prisma/lib/prisma";
import type { Prisma } from "../../../generated/prisma/client";

type AuditLogBase = Omit<
  Prisma.AuditLogGetPayload<{
    include: { user: { select: { name: true; email: true } } };
  }>,
  "oldValue" | "newValue" | "crudAction"
>;

type AuditLogEntry = AuditLogBase & {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  crudAction: "INSERT" | "UPDATE" | "DELETE";
};

export const auditRouter = router({
  // ── Audit log entries (last 30 days, admin only) ───────────────
  getAll: adminProc
    .input(
      z.object({
        tableName: z.string().optional(),
        fk_user: z.string().optional(),
        action: z.enum(["INSERT", "UPDATE", "DELETE"]).optional(),
        skip: z.number().int().min(0).default(0),
        take: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const where: Prisma.AuditLogWhereInput = {
        // 30 days limit — also enforced at table level by the cleanup cron
        dateTime: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      };

      if (input.tableName) where.tableName = input.tableName;
      if (input.fk_user) where.fk_user = input.fk_user;
      if (input.action) where.crudAction = input.action;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { dateTime: "desc" },
          skip: input.skip,
          take: input.take,
          include: {
            user: { select: { name: true, email: true } },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return { logs: logs as AuditLogEntry[], total };
    }),
});