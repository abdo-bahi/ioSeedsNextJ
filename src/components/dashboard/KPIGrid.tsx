"use client";

import {
  Wifi,
  Droplets,
  Thermometer,
  Waves,
  TriangleAlert,
  LucideIcon,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { SensorDetailsDialog } from "@/components/dashboard/SensorDetailsDialog";
import { useFieldStore } from "@/store/field-store";
import { trpc } from "@/lib/trpc/client";
import { useSSE } from "@/lib/use-sse";
import { useState } from "react";
import { t, formatRelative } from "@/i18n";

// ── Icon + color maps ─────────────────────────────────────────────
const sensorIconMap: Record<string, LucideIcon> = {
  soil_moisture: Droplets,
  temperature: Thermometer,
  humidity: Waves,
  flow_rate: TriangleAlert,
};

function KPICardSkeleton() {
  return (
    <div className="border-t-4 border-t-[#D6E8DC] rounded-xl p-5 bg-card animate-pulse">
      <div className="h-3 w-24 bg-green-soft rounded mb-4" />
      <div className="h-8 w-16 bg-green-soft rounded mb-2" />
      <div className="h-3 w-32 bg-green-soft rounded" />
    </div>
  );
}

export function KPIGrid() {
  const { selectedField } = useFieldStore();
  const queryClient = trpc.useUtils();
  const [detailsType, setDetailsType] = useState<string | null>(null);

  const {
    data: sensorReadings,
    isLoading: sensorsLoading,
    isError: sensorsError,
  } = trpc.sensor.getLatestPerField.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    {
      enabled: !!selectedField?.id,
    }
  );

  const {
    data: mcus,
    isLoading: mcusLoading,
    isError: mcusError,
  } = trpc.mcu.getAllMcus.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    {
      enabled: !!selectedField?.id,
      refetchInterval: 30000,
    }
  );

  useSSE({
    sensor_reading: () => {
      queryClient.sensor.getLatestPerField.invalidate({
        irrigationFieldId: selectedField?.id ?? "",
      });
    },
    actuator_state: () => {
      queryClient.mcu.getAllMcus.invalidate({
        irrigationFieldId: selectedField?.id ?? "",
      });
    },
    device_status: () => {
      queryClient.mcu.getAllMcus.invalidate({
        irrigationFieldId: selectedField?.id ?? "",
      });
    },
  });

  // ── MCU derived values ────────────────────────────────────────
  // "Actifs" = MCUs actually connected right now (source of truth:
  // status is kept by the worker + watchdog), not the config flag.
  const nbMcu = mcus?.length ?? 0;
  const nbActiveMcu =
    mcus?.filter((mcu) => mcu.status === "ONLINE").length ?? 0;

  // ── Color based on MCU thresholds ─────────────────────────────
  function getSensorColor(
    sensorType: string,
    average: number
  ): "green" | "amber" | "red" | "blue" {
    if (sensorType === "temperature") {
      if (average > 35) return "red";
      if (average > 28) return "amber";
      return "blue";
    }
    return "green";
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[18px] font-bold text-foreground">
          {selectedField?.name ?? "—"}
        </h2>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MCU card */}
        {mcusLoading ? (
          <KPICardSkeleton />
        ) : mcusError ? (
          <KPICard
            title={t("dashboard.kpi.activeMcus")}
            value="—"
            subtitle={t("dashboard.kpi.loadError")}
            icon={Wifi}
            color="red"
          />
        ) : (
          <KPICard
            title={t("dashboard.kpi.activeMcus")}
            value={`${nbActiveMcu} / ${nbMcu}`} 
            subtitle={t("dashboard.kpi.inField")}
            icon={Wifi}
            color={
              nbActiveMcu === 0 ? "red" : nbActiveMcu < nbMcu ? "amber" : "blue"
            }
          />
        )}

        {/* Sensor cards */}
        {sensorsLoading && (
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </>
        )}

        {sensorsError && (
          <div className="col-span-3 text-sm text-[#D95F5F] flex items-center gap-2">
            <TriangleAlert className="h-4 w-4" />
            {t("dashboard.kpi.sensorsError")}
          </div>
        )}

        {!sensorsLoading &&
          !sensorsError &&
          sensorReadings?.map((sensor) => (
            <KPICard
              key={sensor.sensorType} // ✅ key added
              title={sensor.sensorType.replace(/_/g, " ").toUpperCase()}
              value={`${sensor.average}${sensor.unit ?? "%"}`}
              subtitle={formatRelative(sensor.lastReadAt)}
              icon={sensorIconMap[sensor.sensorType] ?? Thermometer}
              color={getSensorColor(sensor.sensorType, sensor.average)}
              onDetails={
                sensor.sensorType !== "example"
                  ? () => setDetailsType(sensor.sensorType)
                  : undefined
              }
            />
          ))}
      </div>

      {detailsType && selectedField?.id && (
        <SensorDetailsDialog
          sensorType={detailsType}
          fieldId={selectedField.id}
          onClose={() => setDetailsType(null)}
        />
      )}
    </div>
  );
}
