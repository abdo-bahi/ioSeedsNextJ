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
import { t, formatRelative } from "@/i18n";

function displayValue(v: number | null): string {
  if (v === null) return "—";
  return String(Math.round(v * 10) / 10);
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border animate-pulse">
      <div className="space-y-1.5">
        <div className="h-3 w-28 bg-green-soft rounded" />
        <div className="h-2 w-20 bg-green-soft rounded" />
      </div>
      <div className="h-5 w-12 bg-green-soft rounded" />
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
            <Radio className="h-4 w-4 text-primary" />
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
            <p className="text-[12px] text-muted-foreground text-center py-6">
              {t("dashboard.sensorDetails.empty")}
            </p>
          )}

          {sensors.map((s) => {
            const current = resolveSensorValue(s.lastReading, s);
            const readingAt = s.lastReading?.createdAt ?? null;
            const hasDeviceSignal = s.lastSeenAt != null;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-canvas transition-colors"
              >
                {/* Name + MCU */}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {s.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
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
                  <p className="text-[15px] font-bold text-foreground leading-none">
                    {displayValue(current)}
                    <span className="text-[11px] font-medium text-muted-foreground ml-0.5">
                      {unit}
                    </span>
                  </p>
                  {s.rowValueConversion && s.lastReading?.rawValue != null && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {t("dashboard.sensorDetails.raw", { n: Math.round(s.lastReading.rawValue) })}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
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