"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";
import { SensorCalibrationSection } from "./SensorCalibrationSection";
import { resolveSensorValue } from "@/lib/sensor-conversion";

// ── Helpers ───────────────────────────────────────────────────────
function formatRelative(date: Date | string | null): string {
  if (!date) return "—";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      className={`text-[11px] px-2 py-0.5 border-0 rounded-full ${
        isActive ? "bg-[#E6F7ED] text-[#2D8653]" : "bg-muted text-muted-foreground"
      }`}
    >
      {isActive ? "• Online" : "• Inactif"}
    </Badge>
  );
}

// Color per sensor type tag
const typeColors: Record<string, string> = {
  soil_moisture: "bg-[#E6F7ED] text-[#2D8653]",
  soilMoisture: "bg-[#E6F7ED] text-[#2D8653]",
  temperature: "bg-[#FEF3DC] text-[#B8780E]",
  airTemp: "bg-[#FEF3DC] text-[#B8780E]",
  airTempHumidity: "bg-[#EEF2FF] text-[#4F6EF7]",
  humidity: "bg-[#EEF2FF] text-[#4F6EF7]",
  airHumidity: "bg-[#EEF2FF] text-[#4F6EF7]",
  flow_rate: "bg-[#FDE8F0] text-[#B84070]",
};

function TypeTag({ type }: { type: string }) {
  const color = typeColors[type] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${color}`}>
      {type}
    </span>
  );
}

// ── Form type ─────────────────────────────────────────────────────
type SensorForm = {
  name: string;
  macAddress: string;
  latitude: string;
  longitude: string;
  minAnalogue: string;
  maxAnalogue: string;
  minToConvertValue: string;
  maxToConvertValue: string;
  unit: string;
  rowValueConversion: boolean;
  isActive: boolean;
  fk_mcu: string;
  fk_sensorType: string;
};

const emptyForm: SensorForm = {
  name: "",
  macAddress: "",
  latitude: "36.4703",
  longitude: "2.8277",
  minAnalogue: "0",
  maxAnalogue: "1023",
  minToConvertValue: "0",
  maxToConvertValue: "100",
  unit: "%",
  rowValueConversion: true,
  isActive: true,
  fk_mcu: "",
  fk_sensorType: "",
};

// ── MAC address format check ─────────────────────────────────────
const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

function validateMac(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return MAC_REGEX.test(value.trim())
    ? undefined
    : "Format invalide — ex : AA:BB:CC:DD:EE:FF";
}

function normalizeMac(value: string): string {
  return value.trim().toUpperCase().replace(/-/g, ":");
}

// ── Sensor Modal ──────────────────────────────────────────────────
function SensorModal({
  open,
  onClose,
  onSubmit,
  initial,
  isLoading,
  title,
  fields,
  mcus,
  sensorTypes,
  sensorId,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: SensorForm) => void;
  initial?: SensorForm;
  isLoading: boolean;
  title: string;
  sensorId?: string;
  fields: { id: string; name: string | null }[];
  mcus: { id: string; name: string | null; fk_irrigationField: string }[];
  sensorTypes: { name: string }[];
}) {
  const [form, setForm] = useState<SensorForm>(initial ?? emptyForm);
  const [macError, setMacError] = useState<string | undefined>();
  const [selectedFieldId, setSelectedFieldId] = useState(
    // Pre-select field based on initial MCU
    mcus.find((m) => m.id === initial?.fk_mcu)?.fk_irrigationField ??
      fields[0]?.id ??
      ""
  );

  function set<K extends keyof SensorForm>(key: K, val: SensorForm[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  function handleSubmit() {
    if (validateMac(form.macAddress)) {
      setMacError(validateMac(form.macAddress));
      return;
    }
    onSubmit({
      ...form,
      macAddress: form.macAddress.trim() ? normalizeMac(form.macAddress) : "",
    });
  }

  // Filter MCUs by selected field
  const filteredMcus = mcus.filter(
    (m) => m.fk_irrigationField === selectedFieldId
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Name + MAC */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Nom du capteur
              </Label>
              <Input
                placeholder="Sol-A1"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="border-border focus-visible:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">Adresse MAC</Label>
              <Input
                placeholder="AA:BB:CC:DD:EE:FF"
                value={form.macAddress}
                onChange={(e) => {
                  const value = e.target.value;
                  set("macAddress", value);
                  if (macError) setMacError(validateMac(value));
                }}
                aria-invalid={!!macError}
                className={`border-border focus-visible:ring-primary font-mono text-[12px] uppercase ${
                  macError ? "border-[#D95F5F] focus-visible:ring-[#D95F5F]" : ""
                }`}
              />
              {macError && (
                <p className="text-[11px] text-[#D95F5F]">{macError}</p>
              )}
            </div>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">Type</Label>
            <select
              value={form.fk_sensorType}
              onChange={(e) => set("fk_sensorType", e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">— Sélectionner un type —</option>
              {sensorTypes.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Field → MCU selector */}
          <div className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-canvas">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              MCU parent
            </p>

            {/* Step 1 — select field */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">Parcelle</Label>
              <select
                value={selectedFieldId}
                onChange={(e) => {
                  setSelectedFieldId(e.target.value);
                  set("fk_mcu", ""); // reset MCU when field changes
                }}
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Sélectionner une parcelle —</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name ?? f.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2 — select MCU from that field */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">MCU</Label>
              <select
                value={form.fk_mcu}
                onChange={(e) => set("fk_mcu", e.target.value)}
                disabled={!selectedFieldId || filteredMcus.length === 0}
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="">— Sélectionner un MCU —</option>
                {filteredMcus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.id}
                  </option>
                ))}
              </select>
              {selectedFieldId && filteredMcus.length === 0 && (
                <p className="text-[11px] text-[#E89B2D]">
                  Aucun MCU dans cette parcelle.
                </p>
              )}
            </div>
          </div>

          {/* ── Calibration section ── */}
          <SensorCalibrationSection
            sensorId={sensorId}
            minAnalogue={form.minAnalogue}
            maxAnalogue={form.maxAnalogue}
            minToConvertValue={form.minToConvertValue}
            maxToConvertValue={form.maxToConvertValue}
            unit={form.unit}
            rowValueConversion={form.rowValueConversion}
            onMinChange={(val) => set("minAnalogue", val)}
            onMaxChange={(val) => set("maxAnalogue", val)}
            onMinToChange={(val) => set("minToConvertValue", val)}
            onMaxToChange={(val) => set("maxToConvertValue", val)}
            onUnitChange={(val) => set("unit", val)}
            onConversionToggle={(val) => set("rowValueConversion", val)}
          />

          {/* GPS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">Latitude</Label>
              <Input
                placeholder="36.4703"
                type="number"
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
                className="border-border focus-visible:ring-primary font-mono text-[12px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">Longitude</Label>
              <Input
                placeholder="2.8277"
                type="number"
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
                className="border-border focus-visible:ring-primary font-mono text-[12px]"
              />
            </div>
          </div>

          {/* isActive toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-canvas">
            <div>
              <p className="text-[13px] font-medium text-foreground">
                Capteur actif
              </p>
              <p className="text-[11px] text-muted-foreground">
                Désactiver pour ignorer ce capteur
              </p>
            </div>
            <button
              onClick={() => set("isActive", !form.isActive)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                form.isActive ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 bg-card rounded-full shadow transition-transform ${
                  form.isActive ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border text-muted-foreground"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !form.name || !!macError}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isLoading ? "..." : "Sauvegarder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Sensors Table ────────────────────────────────────────────
export function SensorsTable({
  irrigationFieldId,
  farmId,
}: {
  irrigationFieldId: string;
  farmId: string;
}) {
  const utils = trpc.useUtils();

  const [mcuFilter, setMcuFilter] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── Queries ───────────────────────────────────────────────────
  const { data: sensors, isLoading } = trpc.sensor.getAllByField.useQuery(
    { irrigationFieldId, mcuId: mcuFilter || undefined },
    { refetchInterval: 30000 }
  );

  const { data: mcus } = trpc.mcu.getAllMcus.useQuery({ irrigationFieldId });
  const { data: fields } = trpc.irrigationField.getAllByFarm.useQuery({
    farmId,
  });
  const { data: sensorTypes } = trpc.sensor.getTypes.useQuery();

  // All MCUs across all fields (for the modal selector)
  const allMcus =
    mcus?.map((m: any) => ({
      id: m.id,
      name: m.name,
      fk_irrigationField: irrigationFieldId,
    })) ?? [];

  const fieldOptions = fields?.map((f) => ({ id: f.id, name: f.name })) ?? [];

  // ── Mutations ─────────────────────────────────────────────────
  const invalidate = () => utils.sensor.getAllByField.invalidate();

  const create = trpc.sensor.create.useMutation({
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
    },
  });

  const update = trpc.sensor.update.useMutation({
    onSuccess: () => {
      invalidate();
      setEditTarget(null);
    },
  });

  const remove = trpc.sensor.delete.useMutation({
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  function handleCreate(form: SensorForm) {
    create.mutate({
      name: form.name,
      macAddress: form.macAddress || undefined,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      minAnalogue: parseFloat(form.minAnalogue),
      maxAnalogue: parseFloat(form.maxAnalogue),
      minToConvertValue: parseFloat(form.minToConvertValue),
      maxToConvertValue: parseFloat(form.maxToConvertValue),
      unit: form.unit || "%",
      rowValueConversion: form.rowValueConversion,
      isActive: form.isActive,
      fk_mcu: form.fk_mcu || undefined,
      fk_sensorType: form.fk_sensorType || undefined,
    });
  }

  function handleUpdate(form: SensorForm) {
    if (!editTarget) return;
    update.mutate({
      id: editTarget,
      name: form.name,
      macAddress: form.macAddress || undefined,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      minAnalogue: parseFloat(form.minAnalogue),
      maxAnalogue: parseFloat(form.maxAnalogue),
      minToConvertValue: parseFloat(form.minToConvertValue),
      maxToConvertValue: parseFloat(form.maxToConvertValue),
      unit: form.unit || "%",
      rowValueConversion: form.rowValueConversion,
      isActive: form.isActive,
      fk_mcu: form.fk_mcu || undefined,
      fk_sensorType: form.fk_sensorType || undefined,
    });
  }

  const editSensor = sensors?.find((s: any) => s.id === editTarget);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Sensors
          </p>
          {/* MCU filter */}
          <select
            value={mcuFilter}
            onChange={(e) => setMcuFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-card px-2 text-[12px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Tous les MCUs</option>
            {mcus?.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.name ?? m.id}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white text-[12px] h-8 px-3 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter capteur
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-canvas">
              {[
                "NOM",
                "TYPE",
                "GPS",
                "MAC",
                "MCU",
                "PARCELLE",
                "DERNIÈRE VALEUR",
                "CALIBRATION",
                "STATUT",
                "ACTIONS",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-[#F0F7F3] animate-pulse">
                  {[...Array(10)].map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="h-3 bg-green-soft rounded w-16" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading &&
              sensors?.map((sensor: any) => (
                <tr
                  key={sensor.id}
                  className="border-b border-[#F0F7F3] hover:bg-canvas transition-colors"
                >
                  {/* Name */}
                  <td className="px-4 py-3.5 font-semibold text-foreground">
                    {sensor.name}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3.5">
                    <TypeTag type={sensor.sensorType} />
                  </td>

                  {/* GPS */}
                  <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                    {sensor.latitude.toFixed(4)}°N
                    <br />
                    {sensor.longitude.toFixed(4)}°E
                  </td>

                  {/* MAC */}
                  <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                    {sensor.macAddress ?? "—"}
                  </td>

                  {/* MCU */}
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {sensor.mcuName}
                  </td>

                  {/* Field */}
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {sensor.fieldName}
                  </td>

                  {/* Last reading (converted) */}
                  <td className="px-4 py-3.5">
                    {sensor.lastReading ? (
                      <div>
                        {(() => {
                          const resolved = resolveSensorValue(
                            sensor.lastReading,
                            sensor
                          );
                          return resolved !== null ? (
                            <span
                              className={`font-semibold ${
                                resolved < 30
                                  ? "text-[#D95F5F]"
                                  : resolved < 50
                                  ? "text-[#E89B2D]"
                                  : "text-primary"
                              }`}
                            >
                              {resolved.toFixed(1)}
                              {sensor.unit ?? ""}
                            </span>
                          ) : (
                            <span className="font-semibold text-foreground">
                              {sensor.lastReading.value}
                            </span>
                          );
                        })()}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatRelative(sensor.lastReading.createdAt)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Calibration ranges */}
                  <td className="px-4 py-3.5 text-[12px] text-muted-foreground font-mono">
                    <div>{sensor.minAnalogue}→{sensor.maxAnalogue}</div>
                    <div className="text-[10px] text-muted-foreground">
                      → {sensor.minToConvertValue}→{sensor.maxToConvertValue}{sensor.unit ?? ""}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusBadge isActive={sensor.isActive} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditTarget(sensor.id)}
                        className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(sensor.id)}
                        className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!isLoading && sensors?.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-[13px] text-muted-foreground"
                >
                  Aucun capteur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add modal ── */}
      <SensorModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        isLoading={create.isPending}
        title="Ajouter un capteur"
        fields={fieldOptions}
        mcus={allMcus}
        sensorTypes={sensorTypes ?? []}
      />

      {/* ── Edit modal ── */}
      {editSensor && (
        <SensorModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          isLoading={update.isPending}
          title="Modifier capteur"
          fields={fieldOptions}
          mcus={allMcus}
          sensorTypes={sensorTypes ?? []}
          sensorId={editTarget ?? undefined}
          initial={{
            name: editSensor.name,
            macAddress: editSensor.macAddress ?? "",
            latitude: String(editSensor.latitude),
            longitude: String(editSensor.longitude),
            minAnalogue: String(editSensor.minAnalogue),
            maxAnalogue: String(editSensor.maxAnalogue),
            minToConvertValue: String(editSensor.minToConvertValue),
            maxToConvertValue: String(editSensor.maxToConvertValue),
            isActive: editSensor.isActive,
            unit: editSensor.unit ?? "%",
            rowValueConversion: editSensor.rowValueConversion,
            fk_mcu: editSensor.fk_mcu ?? "",
            fk_sensorType: editSensor.sensorType ?? "",
          }}
        />
      )}

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Supprimer ce capteur ?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            Toutes les données de ce capteur seront supprimées.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button
              onClick={() =>
                deleteTarget && remove.mutate({ id: deleteTarget })
              }
              disabled={remove.isPending}
              className="bg-[#D95F5F] hover:bg-[#C04040] text-white"
            >
              {remove.isPending ? "..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
