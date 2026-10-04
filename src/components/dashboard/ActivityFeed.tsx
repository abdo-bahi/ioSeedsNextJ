// src/components/dashboard/ActivityFeed.tsx
"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useFieldStore } from "@/store/field-store";
import { Activity, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { DateFilter } from "@/components/dashboard/DateFilter";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { useSSE } from "@/lib/use-sse";
import { t, formatRelative, type I18nKey } from "@/i18n";

const PAGE_SIZE = 8;

const selectCls =
  "h-7 rounded-md border border-border bg-card px-2 text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

// Command tracking badges (dashboard → MCU commands)
const cmdBadge: Record<string, { cls: string; labelKey: I18nKey }> = {
  WAITING:   { cls: "bg-[#FEF3DC] text-[#B8780E]", labelKey: "dashboard.activity.cmd.WAITING" },
  DELIVERED: { cls: "bg-[#E8F0FB] text-[#2D5C8E]", labelKey: "dashboard.activity.cmd.DELIVERED" },
  EXECUTED:  { cls: "bg-[#E6F7ED] text-[#2D8653]", labelKey: "dashboard.activity.cmd.EXECUTED" },
  FAILED:    { cls: "bg-[#FDEAEA] text-[#B84040]", labelKey: "dashboard.activity.cmd.FAILED" },
};

export function ActivityFeed() {
  const { selectedField } = useFieldStore();
  const queryClient = trpc.useUtils();

  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mcuId, setMcuId] = useState("");
  const [actuatorId, setActuatorId] = useState("");

  // Live-refresh command states (WAITING → DELIVERED → EXECUTED|FAILED)
  useSSE({
    command_ack: () => {
      queryClient.activity.getRecentByField.invalidate();
    },
  });

  const { data: actuatorList } = trpc.actuator.getAllByField.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    { enabled: !!selectedField?.id }
  );

  const { data: mcuList } = trpc.mcu.getAllMcus.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    { enabled: !!selectedField?.id }
  );

  const { data, isLoading } = trpc.activity.getRecentByField.useQuery(
    {
      irrigationFieldId: selectedField?.id ?? "",
      page,
      pageSize: PAGE_SIZE,
      from: from || undefined,
      to: to || undefined,
      actuatorId: actuatorId || undefined,
    },
    {
      enabled: !!selectedField?.id,
      refetchInterval: 10000,
    }
  );

  // MCUs that own at least one actuator in this field
  const mcuOptions = useMemo(() => {
    const mcuName = new Map((mcuList ?? []).map((m) => [m.id, m.name ?? m.id]));
    const ids = new Set<string>();
    for (const a of actuatorList ?? []) if (a.fk_mcu) ids.add(a.fk_mcu);
    return [...ids].map((id) => ({ id, name: mcuName.get(id) ?? id }));
  }, [actuatorList, mcuList]);

  // Actuators of the selected MCU (all if no MCU chosen)
  const actuatorOptions = useMemo(
    () =>
      (actuatorList ?? []).filter(
        (a) => !mcuId || a.fk_mcu === mcuId
      ),
    [actuatorList, mcuId]
  );

  const activities = data?.items ?? [];
  const onFrom = (v: string) => { setFrom(v); setPage(1); };
  const onTo = (v: string) => { setTo(v); setPage(1); };
  const onMcu = (v: string) => { setMcuId(v); setActuatorId(""); setPage(1); };
  const onActuator = (v: string) => { setActuatorId(v); setPage(1); };
  const resetFilters = () => { setMcuId(""); setActuatorId(""); setFrom(""); setTo(""); setPage(1); };
  const hasFilters = !!(mcuId || actuatorId || from || to);

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
          <Activity className="h-3 w-3" /> {t("dashboard.activity.title")}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#D95F5F] transition-colors"
          >
            <X className="h-3 w-3" /> {t("common.reset")}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-end gap-2 flex-wrap mb-2">
        {/* MCU */}
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("common.mcu")}</Label>
          <select value={mcuId} onChange={(e) => onMcu(e.target.value)} className={selectCls}>
            <option value="">{t("common.allMcus")}</option>
            {mcuOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Actuator */}
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("common.actuator")}</Label>
          <select
            value={actuatorId}
            onChange={(e) => onActuator(e.target.value)}
            className={selectCls}
            disabled={!mcuId && actuatorOptions.length === 0}
          >
            <option value="">{t("common.allActuators")}</option>
            {actuatorOptions.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <DateFilter from={from} to={to} onFrom={onFrom} onTo={onTo} />
      </div>

      {/* List */}
      <div className="flex flex-col gap-0 flex-1">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-2 w-2 rounded-full bg-green-soft mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 w-48 bg-green-soft rounded mb-1" />
                  <div className="h-2 w-20 bg-green-soft rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && activities.length === 0 && (
          <p className="text-[12px] text-muted-foreground text-center py-4">
            {t(hasFilters ? "dashboard.activity.emptyFiltered" : "dashboard.activity.empty")}
          </p>
        )}

        {activities?.map((activity, index) => (
          <div
            key={activity.id}
            className={`flex gap-3 py-2.5 ${
              index < activities.length - 1 ? "border-b border-[#F0F7F3]" : ""
            }`}
          >
            {/* Dot */}
            <div
              className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                activity.isOpen ? "bg-primary" : "bg-[#8FAF9A]"
              }`}
            />

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-foreground leading-snug flex items-center gap-2 flex-wrap">
                {activity.label}
                {activity.sublabel && (
                  <span className="text-muted-foreground"> — {activity.sublabel}</span>
                )}
                {activity.cmdStatus ? (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${cmdBadge[activity.cmdStatus]?.cls ?? "bg-muted text-muted-foreground"}`}>
                    {cmdBadge[activity.cmdStatus] ? t(cmdBadge[activity.cmdStatus].labelKey) : activity.cmdStatus}
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                    {t("dashboard.activity.mcuEvent")}
                  </span>
                )}
              </p>

              {/* Who made the action + type */}
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {activity.isMcuAction
                  ? t("dashboard.activity.auto", { name: activity.mcu ?? t("common.mcu") })
                  : t("dashboard.activity.manual", { name: activity.user ?? t("common.unknown") })}
              </p>

              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatRelative(activity.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {!!data && data.total > 0 && (
        <div className="pt-3 border-t border-[#F0F7F3]">
          <PaginationControls
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onPage={setPage}
          />
        </div>
      )}
    </div>
  );
}