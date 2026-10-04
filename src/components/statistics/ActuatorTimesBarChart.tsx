"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegendContent,
} from "@/components/ui/chart";
import { fmtMinutes1 } from "./format";
import { t } from "@/i18n";

type Row = {
  actuatorName: string;
  mcuName: string;
  manualMs: number;
  autoMs: number;
};

// ── Manual vs auto activation time, per actuator ──────────────────
export function ActuatorTimesBarChart({ data }: { data: Row[] }) {
  const chartData = data.map((d) => ({
    name: d.actuatorName,
    manuel: fmtMinutes1(d.manualMs),
    auto: fmtMinutes1(d.autoMs),
  }));

  const config = {
    manuel: { label: t("statistics.charts.actuatorTimes.manual"), color: "#4CAF7D" },
    auto: { label: t("statistics.charts.actuatorTimes.auto"), color: "#6BA3D6" },
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("statistics.charts.actuatorTimes.title")}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {t("statistics.charts.actuatorTimes.subtitle")}
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-[13px] text-muted-foreground">
          {t("statistics.charts.actuatorTimes.noData")}
        </div>
      ) : (
        <ChartContainer config={config} className="h-[300px] w-full mt-4">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E8F4ED" vertical={false} />

            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#8FAF9A" }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />

            <YAxis
              tick={{ fontSize: 10, fill: "#8FAF9A" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}${t("statistics.charts.actuatorTimes.unit")}`}
              width={52}
              domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax))]}
            />

            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend content={<ChartLegendContent />} />

            <Bar
              dataKey="manuel"
              fill="var(--color-manuel)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="auto"
              fill="var(--color-auto)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}