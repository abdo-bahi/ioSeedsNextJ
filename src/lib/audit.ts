import { prisma } from "../../prisma/lib/prisma";

export type AuditCrudAction = "INSERT" | "UPDATE" | "DELETE";

type AuditParams = {
  tableName: string;
  rowId: string;
  action: AuditCrudAction;
  oldValue?: object | null;
  newValue?: object | null;
  fk_user?: string | null;
};

/**
 * Write an audit log entry.
 * Never throws — a failing audit log must not break the main operation.
 */
export async function audit(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        tableName: params.tableName,
        rowId: params.rowId,
        crudAction: params.action,
        oldValue: params.oldValue ?? undefined,
        newValue: params.newValue ?? undefined,
        fk_user: params.fk_user ?? undefined,
      },
    });
  } catch (err) {
    console.error("⚠️ Audit log failed:", err);
  }
}