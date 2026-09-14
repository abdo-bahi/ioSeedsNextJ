"use client"

import { trpc } from "@/lib/trpc/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowDownToLine } from "lucide-react"

type CalibrationProps = {
  sensorId?:          string         // undefined on create
  minAnalogue:        string
  maxAnalogue:        string
  unit:               string
  rowValueConversion: boolean
  onMinChange:        (val: string)  => void
  onMaxChange:        (val: string)  => void
  onUnitChange:       (val: string)  => void
  onConversionToggle: (val: boolean) => void
}

export function SensorCalibrationSection({
  sensorId,
  minAnalogue,
  maxAnalogue,
  unit,
  rowValueConversion,
  onMinChange,
  onMaxChange,
  onUnitChange,
  onConversionToggle,
}: CalibrationProps) {

  // ── Last reading ───────────────────────────────────────────────
  const { data: lastReading } = trpc.sensor.getLastReading.useQuery(
    { sensorId: sensorId ?? "" },
    { enabled: !!sensorId, refetchInterval: 10000 }
  )

  const lastRaw = lastReading?.rawValue ?? null
  const min     = parseFloat(minAnalogue) || 0
  const max     = parseFloat(maxAnalogue) || 1023

  // ── Conversion preview ─────────────────────────────────────────
  // displayValue = min + (rawValue / 1023) × (max - min)
  const previewValue = lastRaw !== null
    ? min + (lastRaw / 1023) * (max - min)
    : null

  // ── Gradient bar fill % ────────────────────────────────────────
  const fillPct = lastRaw !== null
    ? Math.min(100, Math.max(0, (lastRaw / 1023) * 100))
    : 50

  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">

      {/* ── Header + toggle ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
            ↓ Calibration analogique
          </p>
          <p className="text-[11px] font-medium text-[#1A2E22] mt-0.5">
            Conversion analogique
          </p>
          <p className="text-[10px] text-[#4CAF7D] font-mono mt-0.5">
            displayValue = min + (rawValue / 1023) × (max − min)
          </p>
        </div>
        <button
          onClick={() => onConversionToggle(!rowValueConversion)}
          className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
            rowValueConversion ? "bg-[#4CAF7D]" : "bg-[#D6E8DC]"
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${
            rowValueConversion ? "translate-x-4" : "translate-x-0.5"
          }`} />
        </button>
      </div>

      {/* ── Unit ── */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12px] text-[#5A7A65]">Unité affichée</Label>
        <Input
          placeholder="% , °C , L/min ..."
          value={unit}
          onChange={e => onUnitChange(e.target.value)}
          className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D] h-9"
          disabled={!rowValueConversion}
        />
      </div>

      {/* ── Min + Max ── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Min */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-[#5A7A65]">
            Valeur min analogique (%)
          </Label>
          <Input
            placeholder="0"
            type="number"
            value={minAnalogue}
            onChange={e => onMinChange(e.target.value)}
            disabled={!rowValueConversion}
            className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D] h-9"
          />
          {/* Set as min button */}
          {sensorId && lastRaw !== null && (
            <button
              onClick={() => onMinChange(String(lastRaw))}
              disabled={!rowValueConversion}
              className="flex items-center gap-1.5 text-[11px] text-[#4CAF7D] hover:text-[#2D8653] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDownToLine className="h-3 w-3" />
              Définir comme min
              <span className="text-[#8FAF9A]">
                (dernière val: {lastRaw})
              </span>
            </button>
          )}
          {sensorId && lastRaw === null && (
            <p className="text-[10px] text-[#8FAF9A]">
              Aucune donnée reçue
            </p>
          )}
        </div>

        {/* Max */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-[#5A7A65]">
            Valeur max analogique (%)
          </Label>
          <Input
            placeholder="1023"
            type="number"
            value={maxAnalogue}
            onChange={e => onMaxChange(e.target.value)}
            disabled={!rowValueConversion}
            className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D] h-9"
          />
          {/* Set as max button */}
          {sensorId && lastRaw !== null && (
            <button
              onClick={() => onMaxChange(String(lastRaw))}
              disabled={!rowValueConversion}
              className="flex items-center gap-1.5 text-[11px] text-[#4CAF7D] hover:text-[#2D8653] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDownToLine className="h-3 w-3" />
              Définir comme max
              <span className="text-[#8FAF9A]">
                (dernière val: {lastRaw})
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Calibrated range preview ── */}
      {rowValueConversion && (
        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white border border-[#D6E8DC]">
          <p className="text-[10px] font-semibold text-[#8FAF9A] uppercase tracking-wider">
            Aperçu plage calibrée
          </p>

          {/* Gradient bar */}
          <div className="relative h-[8px] rounded-full overflow-hidden bg-[#E8F4ED]">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(to right, #D95F5F, #E89B2D, #4CAF7D)"
              }}
            />
            {/* Current value indicator */}
            {lastRaw !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[#1A3C2E] rounded-full shadow"
                style={{ left: `calc(${fillPct}% - 6px)` }}
              />
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[#8FAF9A]">
              {min}{unit}
            </span>
            {/* Current converted value */}
            {previewValue !== null && (
              <span className="text-[12px] font-semibold text-[#1A2E22]">
                — {previewValue.toFixed(1)}{unit}
              </span>
            )}
            <span className="text-[11px] text-[#8FAF9A]">
              {max}{unit}
            </span>
          </div>

          {/* Raw value info */}
          {lastRaw !== null && (
            <p className="text-[10px] text-[#8FAF9A] text-center">
              Dernière valeur brute: <strong>{lastRaw}</strong>
              {previewValue !== null && (
                <> → converti: <strong>{previewValue.toFixed(1)}{unit}</strong></>
              )}
            </p>
          )}
        </div>
      )}

    </div>
  )
}