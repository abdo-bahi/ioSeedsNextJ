// src/components/dashboard/DeviceStatusCard.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { useFieldStore } from "@/store/field-store"
import { useSSE } from "@/lib/use-sse"
import {
  Wifi,
  WifiOff,
  Moon,
  HardDrive,
  Clock,
  ChevronRight,
  Filter,
} from "lucide-react"
import { DateFilter } from "@/components/dashboard/DateFilter"
import { PaginationControls } from "@/components/dashboard/PaginationControls"
import { t, formatRelative, type I18nKey } from "@/i18n"

type MCUStatus = "ONLINE" | "OFFLINE" | "SLEEPING" | "ERROR"

type McuRow = {
  id: string
  name: string | null
  status: MCUStatus
  lastSeenAt: Date | string | null
  isActive: boolean
  _count: { sensors: number; actuators: number }
}

const statusStyle: Record<MCUStatus, { dot: string; chip: string; labelKey: I18nKey }> = {
  ONLINE:  { dot: "bg-primary", chip: "bg-[#E6F7ED] text-[#2D8653]", labelKey: "dashboard.devices.status.ONLINE" },
  OFFLINE: { dot: "bg-[#C4C7C5]", chip: "bg-muted text-muted-foreground", labelKey: "dashboard.devices.status.OFFLINE" },
  SLEEPING:{ dot: "bg-[#E89B2D]", chip: "bg-[#FEF3DC] text-[#B8780E]", labelKey: "dashboard.devices.status.SLEEPING" },
  ERROR:   { dot: "bg-[#D95F5F]", chip: "bg-[#FDEAEA] text-[#B84040]", labelKey: "dashboard.devices.status.ERROR" },
}

function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type LogRow = {
  id: string;
  deviceType: string;
  deviceId: string;
  deviceName: string | null;
  event: string;
  source: string;
  dateTime: string;
};

const eventDot: Record<string, string> = {
  ON: "bg-primary", OFF: "bg-[#C4C7C5]", SLEEPING: "bg-[#E89B2D]", ERROR: "bg-[#D95F5F]",
};

function eventLabel(event: string): string {
  switch (event) {
    case "ON": return t("dashboard.devices.event.ON");
    case "OFF": return t("dashboard.devices.event.OFF");
    case "SLEEPING": return t("dashboard.devices.event.SLEEPING");
    case "ERROR": return t("dashboard.devices.event.ERROR");
    default: return event;
  }
}

const sourceLabel: Record<string, I18nKey> = {
  connect: "dashboard.devices.source.connect",
  disconnect: "dashboard.devices.source.disconnect",
  will: "dashboard.devices.source.will",
  status: "dashboard.devices.source.status",
  watchdog: "dashboard.devices.source.watchdog",
  message: "dashboard.devices.source.message",
};

const HISTORY_PAGE_SIZE = 20;

export function DeviceStatusCard() {
  const { selectedField } = useFieldStore();
  const utils = trpc.useUtils();

  const { data: mcus, isLoading } = trpc.mcu.getAllMcus.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    { enabled: !!selectedField?.id, refetchInterval: 30000 }
  );

  // ── Connection history state ─────────────────────────────────
  const [logPage, setLogPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const initialized = useRef(false);

  const { data: log } = trpc.mcu.getConnectionLog.useQuery(
    {
      page: logPage,
      pageSize: HISTORY_PAGE_SIZE,
      from: from || undefined,
      to: to || undefined,
      deviceType: "MCU",
    },
    { refetchInterval: 30000 }
  );

  useSSE({
    device_status: () => {
      utils.mcu.getAllMcus.invalidate();
      utils.mcu.getConnectionLog.invalidate();
    },
  });

  const active = mcus ?? [];
  const online = active.filter((m) => m.status === "ONLINE").length;
  const sleeping = active.filter((m) => m.status === "SLEEPING").length;
  const offline = active.filter((m) => m.status === "OFFLINE").length;
  const total = active.length;

  // Group log rows per MCU (list is already sorted desc by dateTime)
  const groups = useMemo(() => {
    const map = new Map<string, LogRow[]>();
    for (const row of log?.items ?? []) {
      const key = row.deviceId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return [...map.entries()];
  }, [log]);

  // Open the most recent group by default (once)
  const firstKey = groups[0]?.[0];
  useEffect(() => {
    if (!initialized.current && firstKey) {
      initialized.current = true;
      setExpanded(new Set([firstKey]));
    }
  }, [firstKey]);

  const toggleHero = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const onFrom = (v: string) => { setFrom(v); setLogPage(1); };
  const onTo = (v: string) => { setTo(v); setLogPage(1); };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            {t("dashboard.devices.title")}
          </p>
        </div>
        {/* Summary chips */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#2D8653] bg-[#E6F7ED] rounded-full px-2 py-0.5 flex items-center gap-1">
            <Wifi className="h-3 w-3" /> {t("dashboard.devices.onlineChip", { n: online })}
          </span>
          <span className="text-[11px] text-[#B8780E] bg-[#FEF3DC] rounded-full px-2 py-0.5 flex items-center gap-1">
            <Moon className="h-3 w-3" /> {t("dashboard.devices.sleepingChip", { n: sleeping })}
          </span>
          <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 flex items-center gap-1">
            <WifiOff className="h-3 w-3" /> {t("dashboard.devices.offlineChip", { n: offline })}
          </span>
        </div>
      </div>

      {/* MCU list */}
      <div className="divide-y divide-[#F0F7F3]">
        {isLoading &&
          [...Array(2)].map((_, i) => (
            <div key={i} className="px-5 py-3 animate-pulse">
              <div className="h-3 w-32 bg-green-soft rounded mb-2" />
              <div className="h-2 w-24 bg-green-soft rounded" />
            </div>
          ))}

        {!isLoading &&
          active.map((mcu: McuRow) => {
            const s = statusStyle[mcu.status as MCUStatus] ?? statusStyle.OFFLINE;
            return (
              <div key={mcu.id} className="px-5 py-3 flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${s.dot} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">
                    {mcu.name ?? "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("dashboard.devices.counts", {
                      sensors: mcu._count.sensors,
                      actuators: mcu._count.actuators,
                      seen: mcu.lastSeenAt ? t("dashboard.devices.seen", { time: formatRelative(mcu.lastSeenAt) }) : "",
                    })}
                  </p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${s.chip}`}>
                  {t(s.labelKey)}
                </span>
              </div>
            );
          })}

        {!isLoading && total === 0 && (
          <div className="px-5 py-6 text-center text-[12px] text-muted-foreground">
            {t("dashboard.devices.emptyField")}
          </div>
        )}
      </div>

      {/* Connection history — grouped per MCU, collapsible, paginated */}
      <div className="border-t border-border">
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-1 flex-wrap">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> {t("dashboard.devices.history")}
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-3 w-3" />
            <DateFilter from={from} to={to} onFrom={onFrom} onTo={onTo} />
          </div>
        </div>

        {/* Groups */}
        <div className="px-5 py-2 space-y-1.5">
          {(log?.items ?? []).length === 0 && (
            <p className="text-[12px] text-muted-foreground text-center py-3">
              {t(from || to ? "dashboard.devices.noEventsFiltered" : "dashboard.devices.noEvents")}
            </p>
          )}

          {groups.map(([key, rows]) => {
            const open = expanded.has(key);
            const latest = rows[0];
            return (
              <div key={key} className="border border-border rounded-lg">
                {/* Header — click to collapse/expand */}
                <button
                  type="button"
                  onClick={() => toggleHero(key)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-canvas transition-colors"
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
                  />
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${eventDot[latest?.event ?? ""] ?? "bg-[#C4C7C5]"}`}
                  />
                  <span className="text-[12px] font-semibold text-foreground truncate flex-1">
                    {latest?.deviceName ?? rows[0]?.deviceName ?? key}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {t("dashboard.devices.eventCount", { n: rows.length })}
                  </span>
                </button>

                {/* Body */}
                {open && (
                  <div className="border-t border-[#F0F7F3] px-4 py-1.5 divide-y divide-[#F0F7F3]">
                    {rows.map((row) => (
                      <div key={row.id} className="flex items-center gap-2 py-1.5 text-[11px]">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${eventDot[row.event] ?? "bg-[#C4C7C5]"}`}
                        />
                        <span className="font-medium text-foreground">{eventLabel(row.event)}</span>
                        <span className="text-muted-foreground">
                          · {sourceLabel[row.source] ? t(sourceLabel[row.source]) : row.source}
                        </span>
                        <span className="ml-auto text-muted-foreground shrink-0">
                          {formatRelative(row.dateTime)}{" "}
                          <span className="text-[#C2D0C8]">({formatDateTime(row.dateTime)})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {!!log && log.total > 0 && (
          <div className="px-5 pb-3">
            <PaginationControls
              page={log.page}
              totalPages={log.totalPages}
              total={log.total}
              onPage={setLogPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}