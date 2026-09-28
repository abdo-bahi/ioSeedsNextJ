// src/components/dashboard/DeviceStatusCard.tsx
"use client"

import { trpc } from "@/lib/trpc/client"
import { useFieldStore } from "@/store/field-store"
import { useSSE } from "@/lib/use-sse"
import { Wifi, WifiOff, Moon, HardDrive, Clock } from "lucide-react"

type MCUStatus = "ONLINE" | "OFFLINE" | "SLEEPING" | "ERROR"

type McuRow = {
  id: string
  name: string | null
  status: MCUStatus
  lastSeenAt: Date | string | null
  isActive: boolean
  _count: { sensors: number; actuators: number }
}

const statusStyle: Record<MCUStatus, { dot: string; chip: string; label: string }> = {
  ONLINE:  { dot: "bg-[#4CAF7D]", chip: "bg-[#E6F7ED] text-[#2D8653]", label: "En ligne" },
  OFFLINE: { dot: "bg-[#C4C7C5]", chip: "bg-[#F5F5F5] text-[#6B6F6D]", label: "Hors ligne" },
  SLEEPING:{ dot: "bg-[#E89B2D]", chip: "bg-[#FEF3DC] text-[#B8780E]", label: "Veille" },
  ERROR:   { dot: "bg-[#D95F5F]", chip: "bg-[#FDEAEA] text-[#B84040]", label: "Erreur" },
}

function formatRelative(date: string | Date | null): string {
  if (!date) return "—";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
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
  ON: "bg-[#4CAF7D]", OFF: "bg-[#C4C7C5]", SLEEPING: "bg-[#E89B2D]", ERROR: "bg-[#D95F5F]",
};

export function DeviceStatusCard() {
  const { selectedField } = useFieldStore();
  const utils = trpc.useUtils();

  const { data: mcus, isLoading } = trpc.mcu.getAllMcus.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    { enabled: !!selectedField?.id, refetchInterval: 30000 }
  );

  const { data: log } = trpc.mcu.getConnectionLog.useQuery(
    { limit: 12 },
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

  return (
    <div className="bg-white border border-[#D6E8DC] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#D6E8DC]">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-[#8FAF9A]" />
          <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
            Devices connectés
          </p>
        </div>
        {/* Summary chips */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#2D8653] bg-[#E6F7ED] rounded-full px-2 py-0.5 flex items-center gap-1">
            <Wifi className="h-3 w-3" /> {online} en ligne
          </span>
          <span className="text-[11px] text-[#B8780E] bg-[#FEF3DC] rounded-full px-2 py-0.5 flex items-center gap-1">
            <Moon className="h-3 w-3" /> {sleeping} veille
          </span>
          <span className="text-[11px] text-[#6B6F6D] bg-[#F5F5F5] rounded-full px-2 py-0.5 flex items-center gap-1">
            <WifiOff className="h-3 w-3" /> {offline} hors ligne
          </span>
        </div>
      </div>

      {/* MCU list */}
      <div className="divide-y divide-[#F0F7F3]">
        {isLoading &&
          [...Array(2)].map((_, i) => (
            <div key={i} className="px-5 py-3 animate-pulse">
              <div className="h-3 w-32 bg-[#E8F4ED] rounded mb-2" />
              <div className="h-2 w-24 bg-[#E8F4ED] rounded" />
            </div>
          ))}

        {!isLoading &&
          active.map((mcu: McuRow) => {
            const s = statusStyle[mcu.status as MCUStatus] ?? statusStyle.OFFLINE;
            return (
              <div key={mcu.id} className="px-5 py-3 flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${s.dot} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#1A2E22] truncate">
                    {mcu.name ?? "—"}
                  </p>
                  <p className="text-[11px] text-[#8FAF9A]">
                    {mcu._count.sensors} capteurs · {mcu._count.actuators} actionneurs
                    {mcu.lastSeenAt ? ` · vu ${formatRelative(mcu.lastSeenAt)}` : ""}
                  </p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${s.chip}`}>
                  {s.label}
                </span>
              </div>
            );
          })}

        {!isLoading && total === 0 && (
          <div className="px-5 py-6 text-center text-[12px] text-[#8FAF9A]">
            Aucun MCU dans cette parcelle.
          </div>
        )}
      </div>

      {/* Connection log feed */}
      {!!log?.length && (
        <div className="border-t border-[#D6E8DC] px-5 py-3">
          <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase mb-2 flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Activité de connexion
          </p>
          <div className="space-y-1.5">
            {(log as LogRow[]).slice(0, 6).map((row) => (
              <div key={row.id} className="flex items-center gap-2 text-[11px]">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${eventDot[row.event] ?? "bg-[#C4C7C5]"}`} />
                <span className="text-[#1A2E22] font-medium truncate">
                  {row.deviceName ?? row.deviceId}
                </span>
                <span className="text-[#8FAF9A]">→{" "}{row.event === "ON" ? "en ligne" : row.event === "SLEEPING" ? "veille" : "hors ligne"}</span>
                <span className="text-[#8FAF9A] ml-auto shrink-0">
                  {formatRelative(row.dateTime)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}