"use client";
import { Wifi, Droplets, Thermometer, TriangleAlert } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { useFieldStore } from "@/store/field-store";
import { sensorRouter } from "@/server/routers/sensors.router";
import { trpc } from "@/lib/trpc/client";

export function KPIGrid() {
  const { selectedField } = useFieldStore();
  const { data: sensorAvgReadings, isLoading } =
    trpc.sensor.getLatestPerField.useQuery(
      {
        irrigationFieldId: selectedField?.id ?? "",
      },
      { enabled: !!selectedField?.id }
    );
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[18px] font-bold text-[#1A2E22]">
          {selectedField?.name ?? ""}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="MCUs Actifs"
          value="2/2"
          subtitle="dans cette parcelle"
          icon={Wifi}
          color="green"
        />
        {sensorAvgReadings.map((sensor: any) => {
          return (
            <KPICard
              title={sensor?.sensorType?.name}
              value={sensor?.average}
              subtitle={`las updated at ${sensor?.lastReadAt}`}
              icon={
                sensor?.sensorType?.name === "soilMoisture"
                  ? Droplets
                  : Thermometer
              }
              //to use min irrigation later
              color={sensor?.average > 30 ? "green" : "red"}
            />
          );
        })}
      </div>
    </div>
  );
}
