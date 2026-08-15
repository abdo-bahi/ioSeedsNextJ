// src/app/(dashboard)/schedules/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useFieldStore } from "@/store/field-store";
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
import { Plus, Pencil, Trash2, User, CalendarClock } from "lucide-react";

let FARM_ID:string;

const ALL_DAYS = [
  { key: "MONDAY", short: "L" },
  { key: "TUESDAY", short: "M" },
  { key: "WEDNESDAY", short: "M" },
  { key: "THURSDAY", short: "J" },
  { key: "FRIDAY", short: "V" },
  { key: "SATURDAY", short: "S" },
  { key: "SUNDAY", short: "D" },
];

// ── Helpers ───────────────────────────────────────────────────────
function formatTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes()
  ).padStart(2, "0")}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-DZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatRelative(date: Date | string | null): string {
  if (!date) return "—";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 3600) return `Dernier: ${formatTime(date)}`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return formatDate(date);
}

// ── KPI cards ─────────────────────────────────────────────────────
function KPICard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className={`flex-1 p-4 rounded-lg border-l-4 ${color} bg-white border border-[#D6E8DC]`}
    >
      <p className="text-[12px] text-[#8FAF9A] mb-1">{label}</p>
      <p className="text-[28px] font-bold text-[#1A2E22] font-serif">{value}</p>
    </div>
  );
}

// ── Schedule form type ────────────────────────────────────────────
type ScheduleForm = {
  name: string;
  fk_actuator: string;
  duration: string;
  startAt: string;
  startDate: string;
  endDate: string;
  weekDays: string[];
  repeatEveryDays: string;
  scheduleType: "weekdays" | "interval";
  toggleAtThresholds: boolean;
  isActive: boolean;
};

const emptyForm: ScheduleForm = {
  name: "",
  fk_actuator: "",
  duration: "45",
  startAt: "06:00",
  startDate: "",
  endDate: "",
  weekDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  repeatEveryDays: "2",
  scheduleType: "weekdays",
  toggleAtThresholds: true,
  isActive: true,
};

// ── Schedule Modal ────────────────────────────────────────────────
function ScheduleModal({
  open,
  onClose,
  onSubmit,
  initial,
  isLoading,
  title,
  irrigationFieldId,
  farmId,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: ScheduleForm) => void;
  initial?: ScheduleForm;
  isLoading: boolean;
  title: string;
  irrigationFieldId: string;
  farmId: string;
}) {
  const [form, setForm] = useState<ScheduleForm>(initial ?? emptyForm);
  const [selectedMcuId, setSelectedMcuId] = useState("");

  function set<K extends keyof ScheduleForm>(key: K, val: ScheduleForm[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  function toggleDay(day: string) {
    const days = form.weekDays.includes(day)
      ? form.weekDays.filter((d) => d !== day)
      : [...form.weekDays, day];
    set("weekDays", days);
  }

  // Fetch MCUs for field
  const { data: mcus } = trpc.mcu.getAllMcus.useQuery({ irrigationFieldId });
  const { data: fields } = trpc.irrigationField.getAllByFarm.useQuery({
    farmId,
  });

  // Filter actuators by selected MCU
  const { data: actuators } = trpc.actuator.getAllByField.useQuery(
    { irrigationFieldId },
    { enabled: !!irrigationFieldId }
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-[#5A7A65]">
              Nom du programme
            </Label>
            <Input
              placeholder="Matin — Tomates"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
            />
          </div>

          {/* Actuator — select MCU first then actuator */}
          <div className="flex flex-col gap-3 p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
              Actionneur
            </p>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">MCU parent</Label>
              <select
                value={selectedMcuId}
                onChange={(e) => {
                  setSelectedMcuId(e.target.value);
                  set("fk_actuator", "");
                }}
                className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] text-[#1A2E22] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
              >
                <option value="">— Tous les actionneurs —</option>
                {mcus?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Actionneur</Label>
              <select
                value={form.fk_actuator}
                onChange={(e) => set("fk_actuator", e.target.value)}
                className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] text-[#1A2E22] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
              >
                <option value="">— Sélectionner —</option>
                {actuators?.map((a: any) => (
                  (! selectedMcuId || (selectedMcuId && a.fk_mcu === selectedMcuId)) ?
                    <option key={a.id} value={a.id}>
                    {String(a.name)}{" "}
                    {a.actuatorType ? `(${String(a.actuatorType.name)})` : ""}
                  </option>
                  :
                  null    
                ))}
              </select>
            </div>
          </div>

          {/* Time + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">
                Heure de départ
              </Label>
              <Input
                type="time"
                value={form.startAt}
                onChange={(e) => set("startAt", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Durée (min)</Label>
              <Input
                type="number"
                placeholder="45"
                value={form.duration}
                onChange={(e) => set("duration", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
              />
            </div>
          </div>

          {/* Schedule type — weekdays or interval */}
          <div className="flex flex-col gap-3 p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
              Type de répétition
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scheduleType"
                  checked={form.scheduleType === "weekdays"}
                  onChange={() => set("scheduleType", "weekdays")}
                  className="accent-[#4CAF7D]"
                />
                <span className="text-[13px]">Jours de la semaine</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scheduleType"
                  checked={form.scheduleType === "interval"}
                  onChange={() => set("scheduleType", "interval")}
                  className="accent-[#4CAF7D]"
                />
                <span className="text-[13px]">Tous les N jours</span>
              </label>
            </div>

            {/* Weekdays picker */}
            {form.scheduleType === "weekdays" && (
              <div className="flex gap-2 flex-wrap">
                {ALL_DAYS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => toggleDay(d.key)}
                    className={`w-8 h-8 rounded-full text-[12px] font-semibold transition-colors ${
                      form.weekDays.includes(d.key)
                        ? "bg-[#1A3C2E] text-white"
                        : "bg-[#E8F4ED] text-[#8FAF9A]"
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            )}

            {/* Interval picker */}
            {form.scheduleType === "interval" && (
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[#5A7A65]">Tous les</span>
                <Input
                  type="number"
                  min={1}
                  value={form.repeatEveryDays}
                  onChange={(e) => set("repeatEveryDays", e.target.value)}
                  className="w-20 border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
                />
                <span className="text-[13px] text-[#5A7A65]">jours</span>
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Date début</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Date fin</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
              />
            </div>
          </div>

          {/* toggleAtThresholds */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <div>
              <p className="text-[13px] font-medium text-[#1A2E22]">
                Arrêt par seuil
              </p>
              <p className="text-[11px] text-[#8FAF9A]">
                Stopper si l&apos;humidité est atteinte
              </p>
            </div>
            <button
              onClick={() =>
                set("toggleAtThresholds", !form.toggleAtThresholds)
              }
              className={`w-10 h-6 rounded-full transition-colors relative ${
                form.toggleAtThresholds ? "bg-[#4CAF7D]" : "bg-[#D6E8DC]"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${
                  form.toggleAtThresholds ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#D6E8DC] text-[#5A7A65]"
          >
            Annuler
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={isLoading || !form.name || !form.fk_actuator}
            className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white"
          >
            {isLoading ? "..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Schedule Card ─────────────────────────────────────────────────
function ScheduleCard({
  schedule,
  onToggle,
  onEdit,
  onDelete,
}: {
  schedule: any;
  onToggle: (id: string, val: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isWeekdays = schedule.weekDays?.length > 0;

  const triggerLabel = schedule.toggleAtThresholds
    ? `seuil min ${schedule.actuator?.mcu?.minSoilMoisture ?? "?"}%`
    : null;

  const repeatLabel = isWeekdays
    ? null
    : `tous les ${schedule.repeatEveryDays} jours`;

  return (
    <div className="bg-white border border-[#D6E8DC] rounded-xl p-5 flex gap-5">
      {/* ── Time + duration ── */}
      <div className="min-w-[64px] flex flex-col items-start">
        <p className="text-[26px] font-bold text-[#1A2E22] leading-none font-serif">
          {formatTime(schedule.startAt)}
        </p>
        <p className="text-[12px] text-[#8FAF9A] mt-1">
          {schedule.duration} min
        </p>
      </div>

      {/* ── Info ── */}
      <div className="flex-1 min-w-0">
        {/* Name + badges */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-[15px] font-semibold text-[#1A2E22]">
            {schedule.name}
          </p>
          <Badge
            className={`text-[11px] px-2 py-0.5 border-0 rounded-full ${
              schedule.isActive
                ? "bg-[#E6F7ED] text-[#2D8653]"
                : "bg-[#F5F5F5] text-[#888]"
            }`}
          >
            {schedule.isActive ? "• Active" : "• Pause"}
          </Badge>
          <Badge
            className={`text-[11px] px-2 py-0.5 border-0 rounded-full ${
              isWeekdays
                ? "bg-[#E8F4ED] text-[#4CAF7D]"
                : "bg-[#FEF3DC] text-[#B8780E]"
            }`}
          >
            ⚡ {isWeekdays ? "Schedule" : "Manuel"}
          </Badge>
        </div>

        {/* Subtitle */}
        <p className="text-[12px] text-[#5A7A65] mb-2">
          {schedule.actuator?.name}
          {triggerLabel && (
            <>
              {" "}
              · <span className="text-[#E89B2D]">▲ {triggerLabel}</span>
            </>
          )}
          {repeatLabel && <> · {repeatLabel}</>}
          {schedule.startDate && <> · {formatDate(schedule.startDate)}</>}
          {schedule.endDate && <> → {formatDate(schedule.endDate)}</>}
        </p>

        {/* Day pills */}
        {isWeekdays && (
          <div className="flex gap-1.5">
            {ALL_DAYS.map((d) => (
              <span
                key={d.key}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  schedule.weekDays?.includes(d.key)
                    ? "bg-[#1A3C2E] text-white"
                    : "bg-[#F0F7F3] text-[#8FAF9A]"
                }`}
              >
                {d.short}
              </span>
            ))}
          </div>
        )}

        {/* Interval display */}
        {!isWeekdays && schedule.repeatEveryDays > 0 && (
          <p className="text-[12px] text-[#8FAF9A]">
            🔁 Répète tous les {schedule.repeatEveryDays} jours
          </p>
        )}
      </div>

      {/* ── Right side ── */}
      <div className="flex flex-col items-end justify-between gap-3 min-w-[140px]">
        {/* Creator + last run */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-[12px] text-[#5A7A65]">
            <User className="h-3 w-3" />
            <span>Bahi Abderrahmane</span>
          </div>
          <p className="text-[11px] text-[#8FAF9A]">
            {formatDate(schedule.createdAt)}
          </p>
          <p className="text-[11px] text-[#8FAF9A]">
            {formatRelative(schedule.updatedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Toggle */}
          <button
            onClick={() => onToggle(schedule.id, !schedule.isActive)}
            className={`w-10 h-6 rounded-full transition-colors relative ${
              schedule.isActive ? "bg-[#4CAF7D]" : "bg-[#D6E8DC]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${
                schedule.isActive ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>

          <button
            onClick={() => onEdit(schedule.id)}
            className="h-7 w-7 rounded border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#4CAF7D] hover:border-[#4CAF7D] transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onDelete(schedule.id)}
            className="h-7 w-7 rounded border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function SchedulesPage() {
  const { selectedField } = useFieldStore();

  FARM_ID = selectedField?.fk_FarmingUnit ?? "Unnamed farm";
  const utils = trpc.useUtils();

  const [showAll, setShowAll] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: schedules, isLoading } = trpc.schedule.getAllByField.useQuery(
    {
      irrigationFieldId: selectedField?.id ?? "",
      allFields: showAll,
      farmId: FARM_ID,
    },
    {
      enabled: !!selectedField?.id || showAll,
      refetchInterval: 30000,
    }
  );

  const invalidate = () => utils.schedule.getAllByField.invalidate();

  const toggleActive = trpc.schedule.toggleActive.useMutation({
    onSuccess: invalidate,
  });

  const create = trpc.schedule.create.useMutation({
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
    },
  });

  const update = trpc.schedule.update.useMutation({
    onSuccess: () => {
      invalidate();
      setEditTarget(null);
    },
  });

  const remove = trpc.schedule.delete.useMutation({
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  // KPI counts
  const activeCount = schedules?.filter((s: any) => s.isActive).length ?? 0;
  const pausedCount = schedules?.filter((s: any) => !s.isActive).length ?? 0;
  const actuatorCount = new Set(schedules?.map((s: any) => s.fk_actuator)).size;

  function handleCreate(form: ScheduleForm) {
    create.mutate({
      name: form.name,
      fk_actuator: form.fk_actuator,
      duration: parseInt(form.duration),
      startAt: form.startAt || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      weekDays: form.scheduleType === "weekdays" ? (form.weekDays as any) : [],
      repeatEveryDays:
        form.scheduleType === "interval" ? parseInt(form.repeatEveryDays) : 0,
      toggleAtThresholds: form.toggleAtThresholds,
      isActive: form.isActive,
    });
  }

  function handleUpdate(form: ScheduleForm) {
    if (!editTarget) return;
    update.mutate({
      id: editTarget,
      name: form.name,
      fk_actuator: form.fk_actuator,
      duration: parseInt(form.duration),
      startAt: form.startAt || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      weekDays: form.scheduleType === "weekdays" ? (form.weekDays as any) : [],
      repeatEveryDays:
        form.scheduleType === "interval" ? parseInt(form.repeatEveryDays) : 0,
      toggleAtThresholds: form.toggleAtThresholds,
    });
  }

  const editSchedule = schedules?.find((s: any) => s.id === editTarget);

  return (
    <div className="space-y-6">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white border border-[#D6E8DC] rounded-lg p-1">
          <button
            onClick={() => setShowAll(false)}
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              !showAll
                ? "bg-[#1A3C2E] text-white"
                : "text-[#5A7A65] hover:text-[#1A3C2E]"
            }`}
          >
            Parcelle courante
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              showAll
                ? "bg-[#1A3C2E] text-white"
                : "text-[#5A7A65] hover:text-[#1A3C2E]"
            }`}
          >
            Toutes les parcelles
          </button>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Nouveau programme
        </Button>
      </div>

      {/* ── KPI summary ── */}
      {!isLoading && (
        <div className="p-4 rounded-xl border border-[#D6E8DC] bg-white">
          <p className="text-[11px] font-semibold tracking-widest text-[#8FAF9A] uppercase mb-3">
            Configuration active —{" "}
            {showAll ? "Toutes les parcelles" : selectedField?.name ?? "—"}
          </p>
          <div className="flex gap-4">
            <KPICard
              label="Programmes actifs"
              value={activeCount}
              color="border-l-[#4CAF7D]"
            />
            <KPICard
              label="Programmes en pause"
              value={pausedCount}
              color="border-l-[#E89B2D]"
            />
            <KPICard
              label="Actionneurs couverts"
              value={actuatorCount}
              color="border-l-[#6BA3D6]"
            />
          </div>
        </div>
      )}

      {/* ── Schedule cards ── */}
      <div className="flex flex-col gap-4">
        {isLoading &&
          [...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-[120px] bg-white border border-[#D6E8DC] rounded-xl animate-pulse"
            />
          ))}

        {!isLoading && schedules?.length === 0 && (
          <div className="bg-white border border-[#D6E8DC] rounded-xl p-8 text-center text-[13px] text-[#8FAF9A]">
            <CalendarClock className="h-8 w-8 mx-auto mb-3 text-[#D6E8DC]" />
            Aucun programme pour cette parcelle.
            <br />
            Cliquez sur &quot;+ Nouveau programme&quot; pour commencer.
          </div>
        )}

        {schedules?.map((schedule: any) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            onToggle={(id, val) => toggleActive.mutate({ id, isActive: val })}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      {/* ── Add modal ── */}
      <ScheduleModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        isLoading={create.isPending}
        title="Nouveau programme"
        irrigationFieldId={selectedField?.id ?? ""}
        farmId={FARM_ID}
      />

      {/* ── Edit modal ── */}
      {editSchedule && (
        <ScheduleModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          isLoading={update.isPending}
          title={`Modifier — ${editSchedule.name}`}
          irrigationFieldId={selectedField?.id ?? ""}
          farmId={FARM_ID}
          initial={{
            name: editSchedule.name,
            fk_actuator: editSchedule.fk_actuator,
            duration: String(editSchedule.duration),
            startAt: formatTime(editSchedule.startAt),
            startDate: editSchedule.startDate
              ? new Date(editSchedule.startDate).toISOString().split("T")[0]
              : "",
            endDate: editSchedule.endDate
              ? new Date(editSchedule.endDate).toISOString().split("T")[0]
              : "",
            weekDays: editSchedule.weekDays ?? [],
            repeatEveryDays: String(editSchedule.repeatEveryDays),
            scheduleType:
              editSchedule.weekDays?.length > 0 ? "weekdays" : "interval",
            toggleAtThresholds: editSchedule.toggleAtThresholds,
            isActive: editSchedule.isActive,
          }}
        />
      )}

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Supprimer ce programme ?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-[#5A7A65]">
            Le programme sera définitivement supprimé.
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
