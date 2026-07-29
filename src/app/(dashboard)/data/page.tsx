"use client"

import { useState } from "react"
import { IrrigationFieldsTable } from "@/components/data/IrrigationFieldsTable"

const FARM_ID = "cmrzdal5y002pncbiaf53uihe"

const tabs = [
  { value: "fields",    label: "Irrigation Fields" },
  { value: "mcus",      label: "MCUs" },
  { value: "sensors",   label: "Sensors" },
  { value: "actuators", label: "Actuators" },
]

export default function DataPage() {
  const [activeTab, setActiveTab] = useState("fields")

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
        <div className="bg-white border border-[#D6E8DC] rounded-xl p-8 text-center text-[13px] text-[#8FAF9A]">
          MCUs table — coming soon
        </div>
      )}
      {activeTab === "sensors" && (
        <div className="bg-white border border-[#D6E8DC] rounded-xl p-8 text-center text-[13px] text-[#8FAF9A]">
          Sensors table — coming soon
        </div>
      )}
      {activeTab === "actuators" && (
        <div className="bg-white border border-[#D6E8DC] rounded-xl p-8 text-center text-[13px] text-[#8FAF9A]">
          Actuators table — coming soon
        </div>
      )}

    </div>
  )
}