"use client";

import { useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { Timer, Clock, Droplets, Scale } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useFieldStore } from "@/store/field-store";
import { KPICard } from "@/components/dashboard/KPICard";
import { StatsToolbar } from "@/components/statistics/StatsToolbar";
import { RealtimeSensorChart } from "@/components/statistics/RealtimeSensorChart";
import { SensorTypeAreaCharts } from "@/components/statistics/SensorTypeAreaCharts";
import { ActuatorTimesBarChart } from "@/components/statistics/ActuatorTimesBarChart";
import { TypeAvgBarChart } from "@/components/statistics/TypeAvgBarChart";
import { fmtDuration, fmtMinutes } from "@/components/statistics/format";
import { t } from "@/i18n";

function isoDay(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Statistics() {
  const { selectedField } = useFieldStore();
  const FARM_ID = selectedField?.fk_FarmingUnit ?? "";

  const [startDate, setStartDate] = useState(() =>
    isoDay(new Date(Date.now() - 30 * 86_400_000))
  );
  const [endDate, setEndDate] = useState(() => isoDay(new Date()));
  const [fieldId, setFieldId] = useState("");

  const enabled = !!FARM_ID;

  const period = useMemo(
    () => ({
      farmId: FARM_ID,
      fieldId: fieldId || undefined,
      start: startDate,
      end: endDate,
    }),
    [FARM_ID, fieldId, startDate, endDate]
  );
  const periodOpts = { enabled, placeholderData: keepPreviousData };
  const scopeOpts = {
    enabled,
    placeholderData: keepPreviousData,
  };

  const { data: fields } = trpc.irrigationField.getAllByFarm.useQuery(
    { farmId: FARM_ID },
    periodOpts
  );
  const { data: overview } = trpc.stats.overview.useQuery(period, periodOpts);
  const { data: sensors } = trpc.stats.sensors.useQuery(
    { farmId: FARM_ID, fieldId: fieldId || undefined },
    scopeOpts
  );
  const { data: actionTimes } = trpc.stats.actionTimes.useQuery(period, periodOpts);
  const { data: typeAvg } = trpc.stats.typeAvgTimes.useQuery(period, periodOpts);
  const { data: sensorTypes } = trpc.stats.sensorTypeAverages.useQuery(
    period,
    periodOpts
  );

  const fieldOptions = (fields ?? []).map((f) => ({ id: f.id, name: f.name ?? f.id }));

  const chartStartIso = new Date(`${startDate}T00:00:00`).toISOString();
  const chartToIso = new Date(`${endDate}T23:59:59.999`).toISOString();

  const periodStartMs = new Date(`${startDate}T00:00:00`).getTime();
  const periodEndMs = new Date(`${endDate}T23:59:59.999`).getTime();
  const chartHourly = periodEndMs - periodStartMs <= 24 * 60 * 60 * 1000;

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!overview) return;
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([
          {
            [t("statistics.overview.indicator")]: t("statistics.overview.totalDuration"),
            [t("statistics.overview.value")]: fmtDuration(overview.totalIrrigationMs),
            [t("statistics.overview.detail")]: t("statistics.overview.sessions", { n: overview.irrigationSessions }),
          },
          {
            [t("statistics.overview.indicator")]: t("statistics.overview.avgDuration"),
            [t("statistics.overview.value")]: fmtDuration(overview.avgSessionMs),
            [t("statistics.overview.detail")]: t("statistics.overview.sessions", { n: overview.irrigationSessions }),
          },
          {
            [t("statistics.overview.indicator")]: t("statistics.overview.avgSoilMoisture"),
            [t("statistics.overview.value")]: overview.avgSoilMoisture ?? "—",
            [t("statistics.overview.detail")]: overview.soilMoistureUnit,
          },
          {
            [t("statistics.overview.indicator")]: t("statistics.overview.manual"),
            [t("statistics.overview.value")]: fmtDuration(overview.manualMs),
            [t("statistics.overview.detail")]: `${overview.manualPct}%`,
          },
          {
            [t("statistics.overview.indicator")]: t("statistics.overview.auto"),
            [t("statistics.overview.value")]: fmtDuration(overview.autoMs),
            [t("statistics.overview.detail")]: `${overview.autoPct}%`,
          },
        ]),
        t("statistics.actuatorTable.title")
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          (actionTimes ?? []).map((a) => ({
            [t("statistics.actuatorTable.actuator")]: a.actuatorName,
            [t("statistics.actuatorTable.mcu")]: a.mcuName,
            [t("statistics.actuatorTable.type")]: a.actuatorType ?? "—",
            [t("statistics.actuatorTable.manual")]: fmtMinutes(a.manualMs),
            [t("statistics.actuatorTable.auto")]: fmtMinutes(a.autoMs),
            [t("statistics.actuatorTable.total")]: fmtMinutes(a.manualMs + a.autoMs),
          }))
        ),
        t("statistics.export.actuatorsSheet")
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          (typeAvg ?? []).map((t2) => ({
            [t("statistics.actuatorTable.type")]: t2.type,
            [t("statistics.export.avgActive")]: fmtMinutes(t2.avgActiveMs),
            [t("statistics.export.actuatorCount")]: t2.actuatorCount,
            [t("statistics.export.sessions")]: t2.totalSessions,
          }))
        ),
        t("statistics.averages.title")
      );

      const cap = [] as Record<string, string | number>[];
      for (const s of sensorTypes ?? []) {
        for (const p of s.series) {
          cap.push({
            [t("statistics.averages.sensor")]: s.sensorType,
            [t("statistics.averages.period")]: p.time,
            [t("statistics.averages.average")]: p.value,
            [t("statistics.averages.unit")]: s.unit ?? "",
          });
        }
      }
      if (cap.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cap), t("statistics.export.sensorsSheet"));
      }

      XLSX.writeFile(wb, `statistiques_ioseeds_${startDate}_${endDate}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  if (!FARM_ID) {
    return (
      <div className="text-[13px] text-muted-foreground">
        {t("statistics.overview.noField")}
      </div>
    );
  }

  const ratioSubtitle = overview
    ? t("statistics.overview.sessionsIrrigation", { n: overview.irrigationSessions })
    : t("statistics.overview.loading");

  return (
    <div className="space-y-6">
      {/* ── Toolbar ── */}
      <StatsToolbar
        startDate={startDate}
        endDate={endDate}
        fieldId={fieldId}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
        onFieldChange={setFieldId}
        fieldOptions={fieldOptions}
        onExport={handleExport}
        exporting={exporting}
      />

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t("statistics.overview.totalDuration")}
          value={overview ? fmtDuration(overview.totalIrrigationMs) : "—"}
          subtitle={t("statistics.overview.sessionsOnPeriod", { n: overview?.irrigationSessions ?? 0 })}
          icon={Timer}
          color="green"
        />
        <KPICard
          title={t("statistics.overview.avgDurationCard")}
          value={overview ? fmtDuration(overview.avgSessionMs) : "—"}
          subtitle={t("statistics.overview.avgOpenTime")}
          icon={Clock}
          color="blue"
        />
        <KPICard
          title={t("statistics.overview.avgSoilMoistureCard")}
          value={
            overview?.avgSoilMoisture != null
              ? `${overview.avgSoilMoisture}${overview.soilMoistureUnit}`
              : "—"
          }
          subtitle={t("statistics.overview.avgMoistureReadings")}
          icon={Droplets}
          color="green"
        />
        <KPICard
          title={t("statistics.overview.manualAuto")}
          value={
            overview
              ? `${overview.manualPct}% / ${overview.autoPct}%`
              : "—"
          }
          subtitle={ratioSubtitle}
          icon={Scale}
          color="amber"
        />
      </div>

      {/* ── Realtime sensor chart ── */}
      <RealtimeSensorChart
        sensors={sensors ?? []}
        startIso={chartStartIso}
        toIso={chartToIso}
        hourly={chartHourly}
        startMs={periodStartMs}
        endMs={periodEndMs}
        periodLabel={t("statistics.overview.periodRange", { start: startDate, end: endDate })}
      />

      {/* ── Sensor type averages ── */}
      <SensorTypeAreaCharts
        data={sensorTypes ?? []}
        startMs={periodStartMs}
        endMs={periodEndMs}
      />

      {/* ── Actuator times ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActuatorTimesBarChart data={actionTimes ?? []} />
        <TypeAvgBarChart data={typeAvg ?? []} />
      </div>
    </div>
  );
}