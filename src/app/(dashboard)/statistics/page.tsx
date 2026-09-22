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

  const fromMinutes = Math.max(
    60,
    Math.round(
      (Date.now() - new Date(`${startDate}T00:00:00`).getTime()) / 60000
    )
  );

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
            Indicateur: "Durée d'irrigation totale",
            Valeur: fmtDuration(overview.totalIrrigationMs),
            Détail: `${overview.irrigationSessions} sessions`,
          },
          {
            Indicateur: "Durée moyenne par session",
            Valeur: fmtDuration(overview.avgSessionMs),
            Détail: `${overview.irrigationSessions} sessions`,
          },
          {
            Indicateur: "Humidité du sol moyenne",
            Valeur: overview.avgSoilMoisture ?? "—",
            Détail: overview.soilMoistureUnit,
          },
          {
            Indicateur: "Irrigation manuelle",
            Valeur: fmtDuration(overview.manualMs),
            Détail: `${overview.manualPct}%`,
          },
          {
            Indicateur: "Irrigation automatique",
            Valeur: fmtDuration(overview.autoMs),
            Détail: `${overview.autoPct}%`,
          },
        ]),
        "Synthèse"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          (actionTimes ?? []).map((a) => ({
            Actionneur: a.actuatorName,
            MCU: a.mcuName,
            Type: a.actuatorType ?? "—",
            "Manuel (min)": fmtMinutes(a.manualMs),
            "Auto (min)": fmtMinutes(a.autoMs),
            "Total (min)": fmtMinutes(a.manualMs + a.autoMs),
          }))
        ),
        "Actionneurs"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          (typeAvg ?? []).map((t) => ({
            Type: t.type,
            "Moyenne active (min)": fmtMinutes(t.avgActiveMs),
            "Nombre d'actionneurs": t.actuatorCount,
            Sessions: t.totalSessions,
          }))
        ),
        "Moyennes par type"
      );

      const cap = [] as { Capteur: string; Période: string; Moyenne: number; Unité: string }[];
      for (const s of sensorTypes ?? []) {
        for (const p of s.series) {
          cap.push({
            Capteur: s.sensorType,
            Période: p.time,
            Moyenne: p.value,
            Unité: s.unit ?? "",
          });
        }
      }
      if (cap.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cap), "Capteurs");
      }

      XLSX.writeFile(wb, `statistiques_ioseeds_${startDate}_${endDate}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  if (!FARM_ID) {
    return (
      <div className="text-[13px] text-[#8FAF9A]">
        Sélectionnez d'abord un champ pour afficher les statistiques.
      </div>
    );
  }

  const ratioSubtitle = overview
    ? `${overview.irrigationSessions} sessions d'irrigation`
    : "En cours de chargement...";

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
          title="Durée d'irrigation totale"
          value={overview ? fmtDuration(overview.totalIrrigationMs) : "—"}
          subtitle={`${overview?.irrigationSessions ?? 0} sessions sur la période`}
          icon={Timer}
          color="green"
        />
        <KPICard
          title="Durée moyenne / session"
          value={overview ? fmtDuration(overview.avgSessionMs) : "—"}
          subtitle="Temps d'ouverture moyen d'une session d'irrigation"
          icon={Clock}
          color="blue"
        />
        <KPICard
          title="Humidité sol moyenne"
          value={
            overview?.avgSoilMoisture != null
              ? `${overview.avgSoilMoisture}${overview.soilMoistureUnit}`
              : "—"
          }
          subtitle="Moyenne des lectures d'humidité du sol"
          icon={Droplets}
          color="green"
        />
        <KPICard
          title="Manuel / Auto"
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
        fromMinutes={fromMinutes}
        periodLabel={`Depuis le ${startDate}`}
      />

      {/* ── Sensor type averages ── */}
      <SensorTypeAreaCharts data={sensorTypes ?? []} />

      {/* ── Actuator times ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActuatorTimesBarChart data={actionTimes ?? []} />
        <TypeAvgBarChart data={typeAvg ?? []} />
      </div>
    </div>
  );
}