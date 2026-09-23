"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSSE } from "@/lib/use-sse";
import { getSensorColor } from "@/lib/sensor-colors";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

type Sensor = { id: string; name: string; fk_sensorType: string | null; unit: string | null };

type TooltipProps = {
  active?: boolean;
  payload?: { value: number }[];
  label?: number;
  unit?: string;
  color?: string;
};

function CustomTooltip({ active, payload, label, unit, color }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#D6E8DC] rounded-lg shadow-sm px-3 py-2">
      <p className="text-[11px] text-[#8FAF9A] mb-1">
        {new Date(Number(label)).toLocaleString("fr-DZ", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      <p className="text-[14px] font-semibold" style={{ color }}>
        {Number(payload[0].value).toFixed(1)}
        {unit}
      </p>
    </div>
  );
}

// ── Realtime sensor chart (honors the toolbar period via an explicit window) ──
export function RealtimeSensorChart({
  sensors,
  startIso,
  toIso,
  hourly,
  startMs,
  endMs,
  periodLabel,
}: {
  sensors: Sensor[];
  startIso: string;
  toIso: string;
  hourly: boolean;
  startMs: number;
  endMs: number;
  periodLabel: string;
}) {
  const utils = trpc.useUtils();
  const [selectedSensorId, setSelectedSensorId] = useState("");
  const [prevSensors, setPrevSensors] = useState(sensors);

  if (prevSensors !== sensors) {
    setPrevSensors(sensors);
    if (sensors.length && !sensors.some((s) => s.id === selectedSensorId)) {
      setSelectedSensorId(sensors[0].id);
    }
  }

  const { data: chartData, isLoading } = trpc.sensor.getChartData.useQuery(
    { sensorId: selectedSensorId, startIso, toIso },
    { enabled: !!selectedSensorId }
  );

  useSSE({
    sensor_reading: (data: unknown) => {
      const d = data as { sensorId?: string };
      if (d.sensorId === selectedSensorId) {
        utils.sensor.getChartData.invalidate({ sensorId: selectedSensorId });
      }
    },
  });

  const selectedSensor = sensors.find((s) => s.id === selectedSensorId);
  const colorInfo = getSensorColor(selectedSensor?.fk_sensorType ?? null);
  const chartConfig = {
    value: { label: colorInfo.label, color: colorInfo.color },
  };
  const points = (chartData ?? []).map((p) => ({
    ts: new Date(p.time).getTime(),
    value: p.value,
  }));

  return (
    <div className="bg-white border border-[#D6E8DC] rounded-xl p-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
            Données temps réel — Capteur
          </p>
          <p className="text-[12px] text-[#8FAF9A] mt-0.5">{periodLabel}</p>
        </div>
      </div>

      {/* ── Sensor selector ── */}
      {sensors.length > 0 && (
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
        <div className="h-[240px] bg-[#F7F9F5] rounded-lg animate-pulse" />
      ) : !chartData || chartData.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-[13px] text-[#8FAF9A]">
          Aucune donnée disponible
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <AreaChart
            data={points}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="statsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorInfo.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colorInfo.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E8F4ED" vertical={false} />

            <XAxis
              dataKey="ts"
              type="number"
              domain={[startMs, endMs]}
              tickFormatter={(ms: number) => {
                const d = new Date(Number(ms));
                if (hourly) {
                  return d.toLocaleTimeString("fr-DZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                }
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
              tickFormatter={(v: number) => `${v}${colorInfo.unit}`}
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
              fill="url(#statsGrad)"
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