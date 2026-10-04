"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { fmtMinutes } from "./format";
import { t } from "@/i18n";

type Row = {
  type: string;
  avgActiveMs: number;
  actuatorCount: number;
};

// ── Average active time per actuator type (horizontal bars) ───────
export function TypeAvgBarChart({ data }: { data: Row[] }) {
  const chartData = data.map((d) => ({
    type: d.type,
    min: fmtMinutes(d.avgActiveMs),
  }));

  const config = {
    min: { label: t("statistics.charts.typeAvg.axis"), color: "#4CAF7D" },
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("statistics.charts.typeAvg.title")}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {t("statistics.charts.typeAvg.subtitle")}
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-[13px] text-muted-foreground">
          {t("statistics.charts.typeAvg.noData")}
        </div>
      ) : (
        <ChartContainer config={config} className="h-[260px] w-full mt-4">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: -10, bottom: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E8F4ED" horizontal={false} />

            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "#8FAF9A" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}${t("statistics.charts.typeAvg.legend")}`}
            />

            <YAxis
              type="category"
              dataKey="type"
              width={120}
              tick={{ fontSize: 11, fill: "#5A7A65" }}
              tickLine={false}
              axisLine={false}
            />

            <ChartTooltip content={<ChartTooltipContent />} />

            <Bar
              dataKey="min"
              fill="var(--color-min)"
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
              label={{
                position: "right",
                fontSize: 10,
                fill: "#8FAF9A",
              }}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}