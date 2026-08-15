"use client"

import { useEffect, useState } from "react"
import { IrrigationFieldsTable } from "@/components/data/IrrigationFieldsTable"
import { useFieldStore } from "@/store/field-store"
import { MCUsTable } from "@/components/data/McuTable"
import { trpc } from "@/lib/trpc/client"
import { SensorsTable } from "@/components/data/SensorsTable"
import { ActuatorsTable } from "@/components/data/ActuatorsTable"

let FARM_ID:string;


const tabs = [
  { value: "fields",    label: "Irrigation Fields" },
  { value: "mcus",      label: "MCUs" },
  { value: "sensors",   label: "Sensors" },
  { value: "actuators", label: "Actuators" },
]

export default function DataPage() {
  const [activeTab, setActiveTab] = useState("fields")
  const { selectedField } = useFieldStore();

  FARM_ID = selectedField?.fk_FarmingUnit ?? "Unnamed farm";

  return (
    <div className="space-y-6">

      {/* ── Custom tabs ── */}
      <div className="border-b border-[#D6E8DC] flex gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`
              px-5 py-2.5 text-[13px] font-medium
              border-b-2 -mb-px transition-colors
              ${activeTab === tab.value
                ? "border-[#4CAF7D] text-[#1A3C2E] font-semibold"
                : "border-transparent text-[#8FAF9A] hover:text-[#1A3C2E]"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "fields" && (
        <IrrigationFieldsTable farmId={FARM_ID} />
      )}
      {activeTab === "mcus" && (
          <MCUsTable
          irrigationFieldId={selectedField?.id ?? ""}
          farmId={FARM_ID}
        />
      )}
      {activeTab === "sensors" && (
          <SensorsTable
          irrigationFieldId={selectedField?.id ?? ""}
          farmId={FARM_ID}
        />
      )}
      {activeTab === "actuators" && (
          <ActuatorsTable
          irrigationFieldId={selectedField?.id ?? ""}
          farmId={FARM_ID}
        />
      )}

    </div>
  )
}