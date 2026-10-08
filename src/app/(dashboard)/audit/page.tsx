"use client";

import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc/client";
import { t, type I18nKey } from "@/i18n";

type CrudAction = "INSERT" | "UPDATE" | "DELETE";

const TAKE = 50;
const ACTION_OPTIONS: CrudAction[] = ["INSERT", "UPDATE", "DELETE"];

const ACTION_STYLES: Record<string, string> = {
  insert: "bg-[#E6F7ED] text-[#2D8653]",
  update: "bg-[#EEF2FF] text-[#4F6EF7]",
  delete: "bg-[#FDEAEA] text-[#B84040]",
};

const TABLE_NAMES = [
  "FarmingUnit",
  "IrrigationField",
  "User",
  "MCU",
  "Sensor",
  "Actuator",
  "Schedule",
  "Threshold",
  "Role",
  "Role_Functionality",
  "RoleMember",
];

function tableLabel(name: string) {
  if (!TABLE_NAMES.includes(name)) return name;
  return t(`audit.tables.${name}` as I18nKey);
}

export default function AuditPage() {
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [skip, setSkip] = useState(0);

  const { data, isLoading, isError } = trpc.audit.getAll.useQuery(
    {
      tableName: tableFilter || undefined,
      action: (actionFilter || undefined) as CrudAction | undefined,
      skip,
      take: TAKE,
    },
    { placeholderData: keepPreviousData }
  );

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / TAKE));
  const currentPage = Math.floor(skip / TAKE) + 1;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-bold text-[#1A2E22] dark:text-foreground">
            {t("audit.title")}
          </h1>
          <p className="text-[12px] text-[#8FAF9A] mt-0.5">
            {t("audit.subtitle")} — {t("common.entries", { n: data?.total ?? 0 })}
          </p>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-2">
          <select
            value={tableFilter}
            onChange={(e) => {
              setTableFilter(e.target.value);
              setSkip(0);
            }}
            className="h-8 rounded-md border border-[#D6E8DC] bg-white dark:bg-card dark:border-border px-2 text-[12px] text-[#5A7A65] dark:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
          >
            <option value="">{t("audit.allTables")}</option>
            {TABLE_NAMES.map((n) => (
              <option key={n} value={n}>
                {tableLabel(n)}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setSkip(0);
            }}
            className="h-8 rounded-md border border-[#D6E8DC] bg-white dark:bg-card dark:border-border px-2 text-[12px] text-[#5A7A65] dark:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
          >
            <option value="">{t("audit.allActions")}</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`audit.action.${a.toLowerCase()}` as I18nKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-card border border-[#D6E8DC] dark:border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#D6E8DC] dark:border-border bg-[#F7F9F5] dark:bg-muted/40">
                {[
                  "audit.column.date",
                  "audit.column.user",
                  "audit.column.action",
                  "audit.column.table",
                  "audit.column.id",
                  "audit.column.changes",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider text-[#8FAF9A]"
                  >
                    {t(h as I18nKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-[#F0F7F3] dark:border-border animate-pulse">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3 bg-[#E8F4ED] dark:bg-muted rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))}

              {isError && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-[#D95F5F]">
                    {t("errors.server")}
                  </td>
                </tr>
              )}

              {!isLoading && !isError && data?.logs.map((log) => (
                <tr key={log.id} className="border-b border-[#F0F7F3] dark:border-border hover:bg-[#F7F9F5] dark:hover:bg-muted/40">
                  {/* Date */}
                  <td className="px-4 py-3 text-[12px] text-[#8FAF9A] whitespace-nowrap">
                    {new Date(log.dateTime).toLocaleString("fr-DZ", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>

                  {/* User */}
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium text-[#1A2E22] dark:text-foreground">
                      {log.user?.name ?? t("audit.userUnknown")}
                    </p>
                    <p className="text-[10px] text-[#8FAF9A]">
                      {log.user?.email ?? ""}
                    </p>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-[11px] px-2 py-0.5 rounded font-medium ${
                        ACTION_STYLES[log.crudAction.toLowerCase()] ?? ""
                      }`}
                    >
                      {t(`audit.action.${log.crudAction.toLowerCase()}` as I18nKey)}
                    </span>
                  </td>

                  {/* Table */}
                  <td className="px-4 py-3 font-mono text-[12px] text-[#5A7A65] dark:text-muted-foreground">
                    {tableLabel(log.tableName)}
                  </td>

                  {/* Row ID */}
                  <td className="px-4 py-3 font-mono text-[11px] text-[#8FAF9A] max-w-[120px] truncate">
                    {log.rowId}
                  </td>

                  {/* Changes */}
                  <td className="px-4 py-3 max-w-[300px]">
                    {log.oldValue && log.newValue ? (
                      <ChangeDiff
                        old={log.oldValue as Record<string, unknown>}
                        next={log.newValue as Record<string, unknown>}
                      />
                    ) : log.newValue ? (
                      <pre className="text-[10px] text-[#5A7A65] dark:text-muted-foreground whitespace-pre-wrap break-all max-h-[60px] overflow-y-auto">
                        {JSON.stringify(log.newValue, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-[#8FAF9A] text-[12px]">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {!isLoading && !isError && data?.logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-[#8FAF9A]">
                    {t("audit.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(data?.total ?? 0) > TAKE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#D6E8DC] dark:border-border">
            <p className="text-[12px] text-[#8FAF9A]">
              {t("common.pageOf", { page: currentPage, total: totalPages })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSkip(Math.max(0, skip - TAKE))}
                disabled={skip === 0}
                className="h-7 px-3 rounded border border-[#D6E8DC] dark:border-border text-[12px] text-[#5A7A65] dark:text-muted-foreground disabled:opacity-40"
              >
                ← {t("common.prev")}
              </button>
              <button
                onClick={() => setSkip(skip + TAKE)}
                disabled={skip + TAKE >= (data?.total ?? 0)}
                className="h-7 px-3 rounded border border-[#D6E8DC] dark:border-border text-[12px] text-[#5A7A65] dark:text-muted-foreground disabled:opacity-40"
              >
                {t("common.next")} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Diff component — shows what changed per field ──────────────────
function ChangeDiff({
  old: oldVal,
  next: newVal,
}: {
  old: Record<string, unknown>;
  next: Record<string, unknown>;
}) {
  const keys = Array.from(
    new Set([...Object.keys(oldVal), ...Object.keys(newVal)])
  );

  const changed = keys.filter(
    (k) => JSON.stringify(oldVal[k]) !== JSON.stringify(newVal[k])
  );

  if (!changed.length)
    return <span className="text-[#8FAF9A] text-[11px]">{t("audit.noChange")}</span>;

  return (
    <div className="flex flex-col gap-1">
      {changed.map((k) => (
        <div key={k} className="text-[11px] flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[#8FAF9A]">{k}:</span>
          <span className="line-through text-[#D95F5F]">
            {String(oldVal[k] ?? "—")}
          </span>
          <span className="text-[#8FAF9A]">→</span>
          <span className="text-[#2D8653] font-medium">
            {String(newVal[k] ?? "—")}
          </span>
        </div>
      ))}
    </div>
  );
}