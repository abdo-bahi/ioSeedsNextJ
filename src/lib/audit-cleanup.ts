import cron from "node-cron";
import { prisma } from "../../prisma/lib/prisma";

const AUDIT_RETENTION_DAYS = 30;

/**
 * Deletes audit log entries older than 30 days.
 * Runs daily at midnight; failures are logged and never thrown.
 */
export function startAuditCleanup() {
  cron.schedule("0 0 * * *", async () => {
    try {
      const cutoff = new Date(
        Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000
      );

      const { count } = await prisma.auditLog.deleteMany({
        where: { dateTime: { lt: cutoff } },
      });

      if (count > 0) {
        console.log(`🧹 Audit cleanup: deleted ${count} logs older than 30 days`);
      }
    } catch (err) {
      console.error("🧹 Audit cleanup failed:", err);
    }
  });

  console.log("🧹 Audit cleanup cron started");
}