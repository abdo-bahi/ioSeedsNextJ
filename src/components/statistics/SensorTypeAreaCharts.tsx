"use client";

import { getSensorColor } from "@/lib/sensor-colors";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

type Series = { time: string; value: number };

function TypeTooltip({ active, payload, label, unit, color }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#D6E8DC] rounded-lg shadow-sm px-3 py-2">
      <p className="text-[11px] text-[#8FAF9A] mb-1">{label}</p>
      <p className="text-[14px] font-semibold" style={{ color }}>
        {Number(payload[0].value).toFixed(1)}
        {unit}
      </p>
    </div>
  );
}

// ── One Area chart per sensor type (units can differ) ─────────────
export function SensorTypeAreaCharts({
  data,
}: {
  data: { sensorType: string; unit: string | null; series: Series[] }[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-[#D6E8DC] rounded-xl p-5">
        <p className="text-[11px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
          Moyennes par type de capteur
        </p>
        <p className="text-[13px] text-[#8FAF9A] mt-4">
          Aucune donnée de capteur sur cette période.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#D6E8DC] rounded-xl p-5 space-y-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
          Moyennes par type de capteur
        </p>
        <p className="text-[12px] text-[#8FAF9A] mt-0.5">
          Valeur moyenne des lectures par période, séparée par type.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data.map((item) => {
          const colorInfo = getSensorColor(item.sensorType);
          const unit = item.unit ?? colorInfo.unit;
          const config = {
            value: { label: colorInfo.label, color: colorInfo.color },
          };
          return (
            <div
              key={item.sensorType}
              className="border border-[#D6E8DC] rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-[#1A3C2E]">
                  {colorInfo.label}
                </p>
                <span className="text-[11px] text-[#8FAF9A] font-mono">
                  {unit}
                </span>
              </div>

              {item.series.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-[12px] text-[#8FAF9A]">
                  Aucune donnée
                </div>
              ) : (
                <ChartContainer config={config} className="h-[180px] w-full">
                  <AreaChart
                    data={item.series}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id={`grad-${item.sensorType}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
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
                      tickFormatter={(iso: string) =>
                        new Date(iso).toLocaleDateString("fr-DZ", {
                          day: "2-digit",
                          month: "2-digit",
                        })
                      }
                      tick={{ fontSize: 10, fill: "#8FAF9A" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />

                    <YAxis
                      tick={{ fontSize: 10, fill: "#8FAF9A" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: any) => `${v}${unit}`}
                    />

                    <ChartTooltip
                      content={
                        <TypeTooltip unit={unit} color={colorInfo.color} />
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={colorInfo.color}
                      strokeWidth={2}
                      fill={`url(#grad-${item.sensorType})`}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}