"use client"

import { Wifi, Droplets, Thermometer, Waves, TriangleAlert, LucideIcon } from "lucide-react"
import { KPICard } from "@/components/dashboard/KPICard"
import { useFieldStore } from "@/store/field-store"
import { trpc } from "@/lib/trpc/client"

// ── Icon + color maps ─────────────────────────────────────────────
const sensorIconMap: Record<string, LucideIcon> = {
  soil_moisture: Droplets,
  temperature:   Thermometer,
  humidity:      Waves,
  flow_rate:     TriangleAlert,
}

function formatRelative(date: Date | null): string {
  if (!date) return "Aucune donnée"
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60)   return `il y a ${diff}s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  return `il y a ${Math.floor(diff / 3600)}h`
}

function KPICardSkeleton() {
  return (
    <div className="border-t-4 border-t-[#D6E8DC] rounded-xl p-5 bg-white animate-pulse">
      <div className="h-3 w-24 bg-[#E8F4ED] rounded mb-4" />
      <div className="h-8 w-16 bg-[#E8F4ED] rounded mb-2" />
      <div className="h-3 w-32 bg-[#E8F4ED] rounded" />
    </div>
  )
}

export function KPIGrid() {
  const { selectedField } = useFieldStore()

  // ── Sensor query ──────────────────────────────────────────────
  const {
    data:      sensorReadings,
    isLoading: sensorsLoading,
    isError:   sensorsError,
  } = trpc.sensor.getLatestPerField.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    { enabled: !!selectedField?.id }
  )

  // ── MCU query ─────────────────────────────────────────────────
  const {
    data:      mcus,
    isLoading: mcusLoading,
    isError:   mcusError,
  } = trpc.mcu.getAllMcus.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    { enabled: !!selectedField?.id }
  )

  // ── MCU derived values ────────────────────────────────────────
  const nbMcu       = mcus?.length ?? 0
  const nbActiveMcu = mcus?.filter((mcu: any) => mcu.isActive).length ?? 0

  const avgMinSoilMoisture = mcus?.length
    ? mcus.reduce((sum: any, mcu: any) => sum + mcu.minSoilMoisture, 0) / mcus.length
    : null

  const avgMaxSoilMoisture = mcus?.length
    ? mcus.reduce((sum: any, mcu: any) => sum + mcu.maxSoilMoisture, 0) / mcus.length
    : null

  // ── Color based on MCU thresholds ─────────────────────────────
  function getSensorColor(
    sensorType: string,
    average:    number
  ): "green" | "amber" | "red" | "blue" {
    if (sensorType === "soil_moisture" && avgMinSoilMoisture && avgMaxSoilMoisture) {
      if (average < avgMinSoilMoisture) return "red"    // too dry
      if (average > avgMaxSoilMoisture) return "amber"  // too wet
      return "green"                                     // optimal
    }
    if (sensorType === "temperature") {
      if (average > 35) return "red"
      if (average > 28) return "amber"
      return "blue"
    }
    return "green"
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[18px] font-bold text-[#1A2E22]">
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
            title="MCUs Actifs"
            value="—"
            subtitle="Erreur de chargement"
            icon={Wifi}
            color="red"
          />
        ) : (
          <KPICard
            title="MCUs Actifs"
            value={`${nbActiveMcu} / ${nbMcu}`}   // ✅ slash not backslash
            subtitle="dans cette parcelle"
            icon={Wifi}
            color={nbActiveMcu === 0 ? "red" : nbActiveMcu < nbMcu ? "amber" : "blue"}
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
            Erreur lors du chargement des capteurs.
          </div>
        )}

        {!sensorsLoading && !sensorsError && sensorReadings?.map((sensor: any) => (
          <KPICard
            key={sensor.sensorType}                              // ✅ key added
            title={sensor.sensorType.replace(/_/g, " ").toUpperCase()}
            value={`${sensor.average}${sensor.unit}`}           // ✅ string not number
            subtitle={formatRelative(sensor.lastReadAt)}
            icon={sensorIconMap[sensor.sensorType] ?? Thermometer}
            color={getSensorColor(sensor.sensorType, sensor.average)}
          />
        ))}

      </div>
    </div>
  )
}