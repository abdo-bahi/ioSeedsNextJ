"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useFieldStore } from "@/store/field-store";
import { useSSE } from "@/lib/use-sse";
import { getSensorColor } from "@/lib/sensor-colors";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// ── Time formatter ────────────────────────────────────────────────
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-DZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
const TIME_RANGES = [
  { label: "Aujourd'hui", value: 60 * 24 },
  { label: "7 jours", value: 60 * 24 * 7 },
  { label: "30 jours", value: 60 * 24 * 30 },
];

// ── Custom tooltip ────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit, color }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#D6E8DC] rounded-lg shadow-sm px-3 py-2">
      <p className="text-[11px] text-[#8FAF9A] mb-1">{label}</p>
      <p className="text-[14px] font-semibold" style={{ color }}>
        {payload[0].value?.toFixed(1)}
        {unit}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export function SensorChart() {
  const { selectedField } = useFieldStore();
  const utils = trpc.useUtils();
  const [fromMinutes, setFromMinutes] = useState(60 * 24);

  const [selectedSensorId, setSelectedSensorId] = useState<string>("");

  // ── Fetch sensors for field ───────────────────────────────────
  const { data: sensors } = trpc.sensor.getSensorsByField.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    {
      enabled: !!selectedField?.id,
    }
  );

  useEffect(() => {
    if (sensors && sensors.length > 0 && !selectedSensorId) {
      setSelectedSensorId(sensors[0].id);
    }
  }, [sensors]);

  // ── Fetch chart data ──────────────────────────────────────────
  const { data: chartData, isLoading } = trpc.sensor.getChartData.useQuery(
    { sensorId: selectedSensorId, fromMinutes },
    { enabled: !!selectedSensorId }
  );

  // ── SSE — invalidate on new reading ──────────────────────────
  useSSE({
    sensor_reading: (data: any) => {
      if (data.sensorId === selectedSensorId) {
        utils.sensor.getChartData.invalidate({ sensorId: selectedSensorId });
      }
    },
  });

  // ── Selected sensor info ──────────────────────────────────────
  const selectedSensor = sensors?.find((s) => s.id === selectedSensorId);
  const colorInfo = getSensorColor(selectedSensor?.fk_sensorType ?? null);

  // ── Chart config ──────────────────────────────────────────────
  const chartConfig = {
    value: {
      label: colorInfo.label,
      color: colorInfo.color,
    },
  };

  return (
    <div className="bg-white border border-[#D6E8DC] rounded-xl p-5">
      {/* ── Header + time range ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
            Données temps réel — Capteur
          </p>
          <p className="text-[12px] text-[#8FAF9A] mt-0.5">
            {TIME_RANGES.find((r) => r.value === fromMinutes)?.label}
          </p>
        </div>

        {/* ── Switch bar ── */}
        <div className="flex gap-0 bg-[#F7F9F5] border border-[#D6E8DC] rounded-lg p-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setFromMinutes(range.value)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                fromMinutes === range.value
                  ? "bg-white text-[#1A2E22] shadow-sm border border-[#D6E8DC]"
                  : "text-[#8FAF9A] hover:text-[#1A2E22]"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sensor selector tabs ── */}
      {sensors && sensors.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {sensors.map((sensor) => {
            const c = getSensorColor(sensor.fk_sensorType);
            const isActive = sensor.id === selectedSensorId;
            return (
              <button
                key={sensor.id}
                onClick={() => setSelectedSensorId(sensor.id)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                  isActive
                    ? "text-white"
                    : "bg-[#F7F9F5] text-[#8FAF9A] hover:text-[#1A2E22]"
                }`}
                style={isActive ? { backgroundColor: c.color } : {}}
              >
                {sensor.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Chart ── */}
      {isLoading ? (
        <div className="h-[200px] bg-[#F7F9F5] rounded-lg animate-pulse" />
      ) : !chartData || chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-[13px] text-[#8FAF9A]">
          Aucune donnée disponible
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={colorInfo.color}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={colorInfo.color}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E8F4ED"
              vertical={false}
            />

            <XAxis
              dataKey="time"
              tickFormatter={(iso) => {
                const d = new Date(iso);
                if (fromMinutes <= 60 * 24) {
                  // Today — show time only
                  return d.toLocaleTimeString("fr-DZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                }
                // 7d or 30d — show date + time
                return d.toLocaleDateString("fr-DZ", {
                  day: "2-digit",
                  month: "2-digit",
                });
              }}
              tick={{ fontSize: 10, fill: "#8FAF9A" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />

            <YAxis
              tick={{ fontSize: 10, fill: "#8FAF9A" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: any) => `${v}${colorInfo.unit}`}
            />

            <ChartTooltip
              content={
                <CustomTooltip unit={colorInfo.unit} color={colorInfo.color} />
              }
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={colorInfo.color}
              strokeWidth={2}
              fill="url(#colorValue)"
              dot={false}
              activeDot={{
                r: 4,
                fill: colorInfo.color,
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ChartContainer>
      )}

      {/* ── Live indicator ── */}
      {chartData && chartData.length > 0 && (
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <div
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: colorInfo.color }}
            />
            <span className="text-[11px] text-[#8FAF9A]">
              Mise à jour en temps réel
            </span>
          </div>
          <span className="text-[11px] text-[#8FAF9A]">
            {chartData.length} lectures
          </span>
        </div>
      )}
    </div>
  );
}
