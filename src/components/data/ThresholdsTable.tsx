"use client"

import { useState } from "react"
import { keepPreviousData } from "@tanstack/react-query"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { t, type I18nKey } from "@/i18n"

function ActionBadge({ action }: { action: boolean | null }) {
  if (action === null || action === undefined) return <span className="text-muted-foreground">—</span>
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
      action
        ? "bg-[#E6F7ED] text-[#2D8653]"   // open = green
        : "bg-[#FDEAEA] text-[#B84040]"   // close = red
    }`}>
      {action ? t("data.thresholds.action.open") : t("data.thresholds.action.close")}
    </span>
  )
}

type ThresholdForm = {
  name:           string
  priority:       string
  fk_sensor:      string
  fk_actuator:    string
  minValue:       string
  maxValue:       string
  minValueAction: "true" | "false" | ""   // ← string for select
  maxValueAction: "true" | "false" | ""
  isActive:       boolean
}

const emptyForm: ThresholdForm = {
  name:           "",
  priority:       "1",
  fk_sensor:      "",
  fk_actuator:    "",
  minValue:       "",
  maxValue:       "",
  minValueAction: "", 
  maxValueAction: "",  
  isActive:       true,
}

// ── Threshold Modal ───────────────────────────────────────────────
function ThresholdModal({
  open, onClose, onSubmit, initial, isLoading, title,
  sensors, actuators,
}: {
  open:       boolean
  onClose:    () => void
  onSubmit:   (form: ThresholdForm) => void
  initial?:   ThresholdForm
  isLoading:  boolean
  title:      string
  sensors:    { id: string; name: string; fk_sensorType: string | null }[]
  actuators:  { id: string; name: string }[]
}) {
  const [form, setForm] = useState<ThresholdForm>(initial ?? emptyForm)

  function set<K extends keyof ThresholdForm>(key: K, val: ThresholdForm[K]) {
    setForm(p => ({ ...p, [key]: val }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">

          {/* Name + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.thresholds.form.name")}</Label>
              <Input
                placeholder={t("data.thresholds.form.namePlaceholder")}
                value={form.name}
                onChange={e => set("name", e.target.value)}
                className="border-border focus-visible:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.thresholds.form.priority")}</Label>
              <Input
                type="number"
                min={1}
                value={form.priority}
                onChange={e => set("priority", e.target.value)}
                className="border-border focus-visible:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground">
                {t("data.thresholds.form.priorityHint")}
              </p>
            </div>
          </div>

          {/* Sensor + Actuator */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.thresholds.form.sensor")}</Label>
              <select
                value={form.fk_sensor}
                onChange={e => set("fk_sensor", e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">{t("common.select")}</option>
                {sensors.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.fk_sensorType ?? "?"})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.thresholds.form.actuator")}</Label>
              <select
                value={form.fk_actuator}
                onChange={e => set("fk_actuator", e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">{t("common.select")}</option>
                {actuators.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Min condition */}
          <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-canvas">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("data.thresholds.form.conditionMin")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] text-muted-foreground">{t("data.thresholds.form.minValue")}</Label>
                <Input
                  type="number"
                  placeholder={t("data.thresholds.form.minPlaceholder")}
                  value={form.minValue}
                  onChange={e => set("minValue", e.target.value)}
                  className="border-border focus-visible:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] text-muted-foreground">{t("data.thresholds.form.action")}</Label>
                <select
                  value={form.minValueAction}
                  onChange={e => set("minValueAction", e.target.value as ThresholdForm["minValueAction"])}
                  className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t("data.thresholds.form.actionNone")}</option>
                  <option value="true">{t("data.thresholds.action.open")}</option>
                  <option value="false">{t("data.thresholds.action.close")}</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("data.thresholds.form.minHint")}
            </p>
          </div>

          {/* Max condition */}
          <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-canvas">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("data.thresholds.form.conditionMax")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] text-muted-foreground">{t("data.thresholds.form.maxValue")}</Label>
                <Input
                  type="number"
                  placeholder={t("data.thresholds.form.maxPlaceholder")}
                  value={form.maxValue}
                  onChange={e => set("maxValue", e.target.value)}
                  className="border-border focus-visible:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] text-muted-foreground">{t("data.thresholds.form.action")}</Label>
                <select
                  value={form.maxValueAction}
                  onChange={e => set("maxValueAction", e.target.value as ThresholdForm["maxValueAction"])}
                  className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t("data.thresholds.form.actionNone")}</option>
                  <option value="true">{t("data.thresholds.action.open")}</option>
                  <option value="false">{t("data.thresholds.action.close")}</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("data.thresholds.form.maxHint")}
            </p>
          </div>

          {/* isActive */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-canvas">
            <p className="text-[13px] font-medium text-foreground">{t("data.thresholds.form.isActive")}</p>
            <button
              onClick={() => set("isActive", !form.isActive)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                form.isActive ? "bg-primary" : "bg-border"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-card rounded-full shadow transition-transform ${
                form.isActive ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
          </div>

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border">
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={isLoading || !form.fk_sensor || !form.fk_actuator}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isLoading ? "..." : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main table ────────────────────────────────────────────────────
export function ThresholdsTable({
  irrigationFieldId,
}: {
  irrigationFieldId: string
  farmId:            string
}) {
  const utils = trpc.useUtils()

  const [addOpen,      setAddOpen]      = useState(false)
  const [editTarget,   setEditTarget]   = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [actuatorFilter, setActuatorFilter] = useState<string>("")

  const { data: thresholds, isLoading } = trpc.threshold.getAllByField.useQuery(
    { irrigationFieldId },
    {
      enabled:          !!irrigationFieldId,
      staleTime:        30_000,
      placeholderData:  keepPreviousData,
    }
  )

  const { data: sensors } = trpc.sensor.getAllByField.useQuery(
    { irrigationFieldId },
    {
      enabled:          !!irrigationFieldId,
      staleTime:        30_000,
      placeholderData:  keepPreviousData,
    }
  )
  const { data: actuators } = trpc.actuator.getAllByField.useQuery(
    { irrigationFieldId },
    {
      enabled:          !!irrigationFieldId,
      staleTime:        30_000,
      placeholderData:  keepPreviousData,
    }
  )

  const filtered = actuatorFilter
    ? thresholds?.filter((t:any) => t.fk_actuator === actuatorFilter)
    : thresholds

  const invalidate = () => utils.threshold.getAllByField.invalidate()

  const create = trpc.threshold.create.useMutation({
    onSuccess: () => { invalidate(); setAddOpen(false) }
  })

  const update = trpc.threshold.update.useMutation({
    onSuccess: () => { invalidate(); setEditTarget(null) }
  })

  const remove = trpc.threshold.delete.useMutation({
    onSuccess: () => { invalidate(); setDeleteTarget(null) }
  })

  const toggleActive = trpc.threshold.toggleActive.useMutation({
    onSuccess: invalidate
  })

  function handleCreate(form: ThresholdForm) {
    create.mutate({
      name:           form.name || undefined,
      priority:       parseInt(form.priority),
      fk_sensor:      form.fk_sensor,
      fk_actuator:    form.fk_actuator,
      minValue:       form.minValue ? parseFloat(form.minValue) : undefined,
      maxValue:       form.maxValue ? parseFloat(form.maxValue) : undefined,
      minValueAction: form.minValueAction !== "" ? form.minValueAction === "true" : undefined,
      maxValueAction: form.maxValueAction !== "" ? form.maxValueAction === "true" : undefined,
      isActive:       form.isActive,
    })
  }

  function handleUpdate(form: ThresholdForm) {
    if (!editTarget) return
    update.mutate({
      id:             editTarget,
      name:           form.name || undefined,
      priority:       parseInt(form.priority),
      fk_sensor:      form.fk_sensor,
      fk_actuator:    form.fk_actuator,
      minValue:       form.minValue ? parseFloat(form.minValue) : null,
      maxValue:       form.maxValue ? parseFloat(form.maxValue) : null,
      minValueAction: form.minValueAction === "" ? null : form.minValueAction === "true",
      maxValueAction: form.maxValueAction === "" ? null : form.maxValueAction === "true",
      isActive:       form.isActive,
    })
  }

  const editThreshold = thresholds?.find((t:any) => t.id === editTarget)

  const sensorOptions   = sensors?.map((s:any) => ({
    id: s.id, name: s.name, fk_sensorType: s.sensorType
  })) ?? []

  const actuatorOptions = actuators?.map((a:any) => ({
    id: a.id, name: a.name
  })) ?? []

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("data.thresholds.title")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("data.thresholds.subtitle")}
            </p>
          </div>

          {/* Actuator filter */}
          <select
            value={actuatorFilter}
            onChange={e => setActuatorFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-card px-2 text-[12px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">{t("common.allActuators")}</option>
            {actuators?.map((a:any) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white text-[12px] h-8 px-3 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("data.thresholds.add")}
        </Button>
      </div>

      {/* No field selected */}
      {!irrigationFieldId && (
        <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
          {t("data.thresholds.noField")}
        </div>
      )}

      {/* Table */}
      {irrigationFieldId && (
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-canvas">
              {[
                "data.thresholds.columns.priority",
                "data.thresholds.columns.name",
                "data.thresholds.columns.sensor",
                "data.thresholds.columns.actuator",
                "data.thresholds.columns.min",
                "data.thresholds.columns.max",
                "data.thresholds.columns.status",
                "data.thresholds.columns.actions",
              ].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  {t(h as I18nKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(3)].map((_, i) => (
              <tr key={i} className="border-b border-[#F0F7F3] animate-pulse">
                {[...Array(8)].map((_, j) => (
                  <td key={j} className="px-4 py-3.5">
                    <div className="h-3 bg-green-soft rounded w-16" />
                  </td>
                ))}
              </tr>
            ))}

            {!isLoading && filtered?.map((t:any) => (
              <tr key={t.id} className="border-b border-[#F0F7F3] hover:bg-canvas transition-colors">

                {/* Priority */}
                <td className="px-4 py-3.5">
                  <span className="h-6 w-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                    {t.priority}
                  </span>
                </td>

                {/* Name */}
                <td className="px-4 py-3.5 font-medium text-foreground">
                  {t.name ?? "—"}
                </td>

                {/* Sensor */}
                <td className="px-4 py-3.5 text-muted-foreground">
                  <div>{t.sensor.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {t.sensor.fk_sensorType}
                  </div>
                </td>

                {/* Actuator */}
                <td className="px-4 py-3.5 text-muted-foreground">
                  <div>{t.actuator.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {t.actuator.actuatorType?.name}
                  </div>
                </td>

                {/* Min condition */}
                <td className="px-4 py-3.5">
                  {t.minValue !== null && t.minValue !== undefined ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-mono text-foreground">
                        {t("data.thresholds.minValue", { n: t.minValue })}
                      </span>
                      <ActionBadge action={t.minValueAction} />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Max condition */}
                <td className="px-4 py-3.5">
                  {t.maxValue !== null && t.maxValue !== undefined ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-mono text-foreground">
                        {t("data.thresholds.maxValue", { n: t.maxValue })}
                      </span>
                      <ActionBadge action={t.maxValueAction} />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => toggleActive.mutate({
                      id:       t.id,
                      isActive: !t.isActive
                    })}
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                      t.isActive
                        ? "bg-[#E6F7ED] text-[#2D8653] hover:bg-[#FDEAEA] hover:text-[#B84040]"
                        : "bg-muted text-muted-foreground hover:bg-[#E6F7ED] hover:text-[#2D8653]"
                    }`}
                  >
                    {t.isActive ? `• ${t("common.active")}` : `• ${t("common.inactive")}`}
                  </button>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditTarget(t.id)}
                      className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t.id)}
                      className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!isLoading && filtered?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  {actuatorFilter
                    ? t("data.thresholds.empty.filtered") : t("data.thresholds.empty.all")
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Add modal */}
      <ThresholdModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        isLoading={create.isPending}
        title={t("data.thresholds.form.titleAdd")}
        sensors={sensorOptions}
        actuators={actuatorOptions}
      />

      {/* Edit modal */}
      {editThreshold && (
        <ThresholdModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          isLoading={update.isPending}
          title={t("data.thresholds.form.titleEdit", { name: editThreshold.name ?? "Seuil" })}
          sensors={sensorOptions}
          actuators={actuatorOptions}
          initial={{
            name:           editThreshold.name ?? "",
            priority:       String(editThreshold.priority),
            fk_sensor:      editThreshold.fk_sensor,
            fk_actuator:    editThreshold.fk_actuator,
            minValue:       editThreshold.minValue?.toString() ?? "",
            maxValue:       editThreshold.maxValue?.toString() ?? "",
            minValueAction: editThreshold.minValueAction == null ? "" : editThreshold.minValueAction ? "true" : "false",
            maxValueAction: editThreshold.maxValueAction == null ? "" : editThreshold.maxValueAction ? "true" : "false",
            isActive:       editThreshold.isActive,
          }}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{t("data.thresholds.delete.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            {t("data.thresholds.delete.message")}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => deleteTarget && remove.mutate({ id: deleteTarget })}
              disabled={remove.isPending}
              className="bg-[#D95F5F] hover:bg-[#C04040] text-white"
            >
              {remove.isPending ? "..." : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}