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
import { t } from "@/i18n";

type Series = { time: string; value: number };

type TooltipProps = {
  active?: boolean;
  payload?: { value: number }[];
  label?: number;
  unit?: string;
  color?: string;
};

function TypeTooltip({ active, payload, label, unit, color }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm px-3 py-2">
      <p className="text-[11px] text-muted-foreground mb-1">
        {new Date(Number(label)).toLocaleDateString("fr-DZ", {
          day: "2-digit",
          month: "2-digit",
        })}
      </p>
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
  startMs,
  endMs,
}: {
  data: { sensorType: string; unit: string | null; series: Series[] }[];
  startMs: number;
  endMs: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("statistics.charts.sensorTypes.title")}
        </p>
        <p className="text-[13px] text-muted-foreground mt-4">
          {t("statistics.charts.sensorTypes.noData")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("statistics.charts.sensorTypes.title")}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {t("statistics.charts.sensorTypes.subtitle")}
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
              className="border border-border rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-foreground">
                  {colorInfo.label}
                </p>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {unit}
                </span>
              </div>

              {item.series.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-[12px] text-muted-foreground">
                  {t("statistics.charts.sensorTypes.empty")}
                </div>
              ) : (
                <ChartContainer config={config} className="h-[180px] w-full">
                  <AreaChart
                    data={item.series.map((p) => ({
                      ts: new Date(p.time).getTime(),
                      value: p.value,
                    }))}
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
                      dataKey="ts"
                      type="number"
                      domain={[startMs, endMs]}
                      tickFormatter={(ms: number) =>
                        new Date(Number(ms)).toLocaleDateString("fr-DZ", {
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
                      tickFormatter={(v: number) => `${v}${unit}`}
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