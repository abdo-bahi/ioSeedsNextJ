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
    min: { label: "Temps actif moyen (min)", color: "#4CAF7D" },
  };

  return (
    <div className="bg-white border border-[#D6E8DC] rounded-xl p-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
          Temps actif moyen par type d'actionneur
        </p>
        <p className="text-[12px] text-[#8FAF9A] mt-0.5">
          Moyenne du temps d'ouverture par actionneur, par type.
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-[13px] text-[#8FAF9A]">
          Aucune activation sur cette période.
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
              tickFormatter={(v: any) => `${v}min`}
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