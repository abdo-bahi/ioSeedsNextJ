"use client";

import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Radio, Wifi, WifiOff } from "lucide-react";
import { resolveSensorValue } from "@/lib/sensor-conversion";

function formatRelative(date: Date | string | null): string {
  if (!date) return "—";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

function displayValue(v: number | null): string {
  if (v === null) return "—";
  return String(Math.round(v * 10) / 10);
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-[#D6E8DC] animate-pulse">
      <div className="space-y-1.5">
        <div className="h-3 w-28 bg-[#E8F4ED] rounded" />
        <div className="h-2 w-20 bg-[#E8F4ED] rounded" />
      </div>
      <div className="h-5 w-12 bg-[#E8F4ED] rounded" />
    </div>
  );
}

export function SensorDetailsDialog({
  sensorType,
  fieldId,
  onClose,
}: {
  sensorType: string;
  fieldId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.sensor.getAllByField.useQuery(
    { irrigationFieldId: fieldId },
    { enabled: !!fieldId, refetchInterval: 10000 }
  );

  // Reset scroll / safety when the type changes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sensors = (data ?? []).filter((s) => s.sensorType === sensorType);
  const unit = sensors[0]?.unit ?? "%";
  const title = sensorType.replace(/_/g, " ").toUpperCase();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#4CAF7D]" />
            {title}
            <Badge className="bg-[#E6F7ED] text-[#2D8653] border-0 rounded-full">
              {sensors.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {isLoading && (
            <>
              <RowSkeleton />
              <RowSkeleton />
            </>
          )}

          {!isLoading && sensors.length === 0 && (
            <p className="text-[12px] text-[#8FAF9A] text-center py-6">
              Aucune donnée pour ce type de capteur
            </p>
          )}

          {sensors.map((s) => {
            const current = resolveSensorValue(s.lastReading, s);
            const readingAt = s.lastReading?.createdAt ?? null;
            const hasDeviceSignal = s.lastSeenAt != null;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#D6E8DC] hover:bg-[#F7F9F5] transition-colors"
              >
                {/* Name + MCU */}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[#1A2E22] truncate">
                    {s.name}
                  </p>
                  <p className="text-[11px] text-[#8FAF9A] flex items-center gap-1">
                    {hasDeviceSignal ? (
                      <Wifi className="h-3 w-3" />
                    ) : (
                      <WifiOff className="h-3 w-3" />
                    )}
                    {s.mcuName}
                  </p>
                </div>

                {/* Value + freshness */}
                <div className="text-right flex-shrink-0">
                  <p className="text-[15px] font-bold text-[#1A3C2E] leading-none">
                    {displayValue(current)}
                    <span className="text-[11px] font-medium text-[#8FAF9A] ml-0.5">
                      {unit}
                    </span>
                  </p>
                  {s.rowValueConversion && s.lastReading?.rawValue != null && (
                    <p className="text-[10px] text-[#8FAF9A] mt-0.5">
                      brut {Math.round(s.lastReading.rawValue)}
                    </p>
                  )}
                  <p className="text-[10px] text-[#8FAF9A] mt-0.5">
                    {formatRelative(readingAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}