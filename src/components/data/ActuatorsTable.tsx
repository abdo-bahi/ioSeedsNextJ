"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input }  from "@/components/ui/input"
import { Label }  from "@/components/ui/label"
import { Badge }  from "@/components/ui/badge"
import { Pencil, Trash2, Plus } from "lucide-react"
import { t, formatRelative, type I18nKey } from "@/i18n"
import { usePermissions } from "@/hooks/use-permissions"

// ── Helpers ───────────────────────────────────────────────────────
const typeColors: Record<string, string> = {
  drip_valve: "bg-[#E6F7ED] text-[#2D8653]",
  sprinkler:  "bg-[#EEF2FF] text-[#4F6EF7]",
  pump:       "bg-[#FEF3DC] text-[#B8780E]",
}

function TypeTag({ type }: { type: string }) {
  const color = typeColors[type] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${color}`}>
      {type}
    </span>
  )
}

// ── State badge ───────────────────────────────────────────────────
function StateBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <Badge className={`text-[11px] px-2 py-0.5 border-0 rounded-full ${
      isOpen
        ? "bg-[#E6F7ED] text-[#2D8653]"
        : "bg-muted text-muted-foreground"
    }`}>
      • {isOpen ? t("data.actuators.state.open") : t("data.actuators.state.closed")}
    </Badge>
  )
}

// ── MCU status badge ──────────────────────────────────────────────
function StatusBadge({ status, isActive }: { status: string; isActive: boolean }) {
  if (!isActive) return (
    <Badge className="text-[11px] px-2 py-0.5 border-0 rounded-full bg-muted text-muted-foreground">
      • {t("data.actuators.status.inactive")}
    </Badge>
  )
  const map: Record<string, { bg: string; text: string; labelKey: I18nKey }> = {
    ONLINE:   { bg: "bg-[#E6F7ED]", text: "text-[#2D8653]", labelKey: "data.actuators.status.online" },
    OFFLINE:  { bg: "bg-muted", text: "text-muted-foreground",    labelKey: "data.actuators.status.offline" },
    SLEEPING: { bg: "bg-[#FEF3DC]", text: "text-[#B8780E]", labelKey: "data.actuators.status.warning" },
    ERROR:    { bg: "bg-[#FDEAEA]", text: "text-[#B84040]", labelKey: "data.actuators.status.error" },
  }
  const s = map[status] ?? map.OFFLINE
  return (
    <Badge className={`text-[11px] px-2 py-0.5 border-0 rounded-full ${s.bg} ${s.text}`}>
      • {t(s.labelKey)}
    </Badge>
  )
}

// ── Form type ─────────────────────────────────────────────────────
type ActuatorForm = {
  name:            string
  macAddress:      string
  latitude:        string
  longitude:       string
  targetState:     boolean
  toggleTimeLimit: string
  isActive:        boolean
  fk_mcu:          string
  fk_actuatorType: string
}

const emptyForm: ActuatorForm = {
  name:            "",
  macAddress:      "",
  latitude:        "36.4703",
  longitude:       "2.8277",
  targetState:     false,
  toggleTimeLimit: "",
  isActive:        true,
  fk_mcu:          "",
  fk_actuatorType: "",
}

// ── MAC address format check ─────────────────────────────────────
const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/

function validateMac(value: string): string | undefined {
  if (!value.trim()) return undefined
  return MAC_REGEX.test(value.trim())
    ? undefined
    : t("errors.format.mac")
}

function normalizeMac(value: string): string {
  return value.trim().toUpperCase().replace(/-/g, ":")
}

// ── Actuator Modal ────────────────────────────────────────────────
function ActuatorModal({
  open, onClose, onSubmit, initial, isLoading, title,
  fields, mcus, actuatorTypes,
}: {
  open:          boolean
  onClose:       () => void
  onSubmit:      (form: ActuatorForm) => void
  initial?:      ActuatorForm
  isLoading:     boolean
  title:         string
  fields:        { id: string; name: string | null }[]
  mcus:          { id: string; name: string | null; fk_irrigationField: string }[]
  actuatorTypes: { name: string }[]
}) {
  const [form, setForm] = useState<ActuatorForm>(initial ?? emptyForm)
  const [macError, setMacError] = useState<string | undefined>()
  const [selectedFieldId, setSelectedFieldId] = useState(
    mcus.find(m => m.id === initial?.fk_mcu)?.fk_irrigationField ?? fields[0]?.id ?? ""
  )

  function set<K extends keyof ActuatorForm>(key: K, val: ActuatorForm[K]) {
    setForm(p => ({ ...p, [key]: val }))
  }

  function handleSubmit() {
    if (validateMac(form.macAddress)) {
      setMacError(validateMac(form.macAddress))
      return
    }
    onSubmit({
      ...form,
      macAddress: form.macAddress.trim() ? normalizeMac(form.macAddress) : "",
    })
  }

  const filteredMcus = mcus.filter(m => m.fk_irrigationField === selectedFieldId)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">

          {/* Name + MAC */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.actuators.form.name")}</Label>
              <Input
                placeholder={t("data.actuators.form.namePlaceholder")}
                value={form.name}
                onChange={e => set("name", e.target.value)}
                className="border-border focus-visible:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.actuators.form.mac")}</Label>
              <Input
                placeholder={t("data.actuators.form.macPlaceholder")}
                value={form.macAddress}
                onChange={e => {
                  const value = e.target.value
                  set("macAddress", value)
                  if (macError) setMacError(validateMac(value))
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
            <Label className="text-[12px] text-muted-foreground">{t("data.actuators.form.type")}</Label>
            <select
              value={form.fk_actuatorType}
              onChange={e => set("fk_actuatorType", e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("common.selectType")}</option>
              {actuatorTypes.map(t => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Field → MCU selector */}
          <div className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-canvas">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("data.actuators.form.mcuParent")}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.actuators.form.field")}</Label>
              <select
                value={selectedFieldId}
                onChange={e => {
                  setSelectedFieldId(e.target.value)
                  set("fk_mcu", "")
                }}
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">{t("common.selectField")}</option>
                {fields.map(f => (
                  <option key={f.id} value={f.id}>{f.name ?? f.id}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.actuators.form.mcu")}</Label>
              <select
                value={form.fk_mcu}
                onChange={e => set("fk_mcu", e.target.value)}
                disabled={!selectedFieldId || filteredMcus.length === 0}
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="">{t("common.selectMcu")}</option>
                {filteredMcus.map(m => (
                  <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
                ))}
              </select>
              {selectedFieldId && filteredMcus.length === 0 && (
                <p className="text-[11px] text-[#E89B2D]">{t("data.actuators.form.noMcuInField")}</p>
              )}
            </div>
          </div>

          {/* GPS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.actuators.form.lat")}</Label>
              <Input
                placeholder={t("data.actuators.form.latPlaceholder")}
                type="number"
                value={form.latitude}
                onChange={e => set("latitude", e.target.value)}
                className="border-border focus-visible:ring-primary font-mono text-[12px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.actuators.form.lon")}</Label>
              <Input
                placeholder={t("data.actuators.form.lonPlaceholder")}
                type="number"
                value={form.longitude}
                onChange={e => set("longitude", e.target.value)}
                className="border-border focus-visible:ring-primary font-mono text-[12px]"
              />
            </div>
          </div>

          {/* Time limit */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{t("data.actuators.form.timeLimit")}</Label>
            <Input
              placeholder={t("data.actuators.form.timeLimitPlaceholder")}
              type="number"
              min={1}
              value={form.toggleTimeLimit}
              onChange={e => set("toggleTimeLimit", e.target.value)}
              className="border-border focus-visible:ring-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              {t("data.actuators.form.timeLimitHint")}
            </p>
          </div>

          {/* Initial state + isActive */}
          <div className="flex flex-col gap-3">
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-canvas">
              <div>
                <p className="text-[13px] font-medium text-foreground">{t("data.actuators.form.isActive")}</p>
                <p className="text-[11px] text-muted-foreground">{t("data.actuators.form.isActiveHint")}</p>
              </div>
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

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border text-muted-foreground">
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !form.name || !!macError}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isLoading ? "..." : t("common.saveSettings")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Actuators Table ──────────────────────────────────────────
export function ActuatorsTable({
  irrigationFieldId,
  farmId,
}: {
  irrigationFieldId: string
  farmId:            string
}) {
  const utils = trpc.useUtils()
  const { canCreate, canUpdate, canDelete } = usePermissions("actuator")

  const [mcuFilter,    setMcuFilter]    = useState("")
  const [addOpen,      setAddOpen]      = useState(false)
  const [editTarget,   setEditTarget]   = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // ── Queries ───────────────────────────────────────────────────
  const { data: actuators, isLoading } = trpc.actuator.getAllByFieldFull.useQuery(
    { irrigationFieldId, mcuId: mcuFilter || undefined },
    { refetchInterval: 15000 }
  )

  const { data: mcus }          = trpc.mcu.getAllMcus.useQuery({ irrigationFieldId })
  const { data: fields }        = trpc.irrigationField.getAllByFarm.useQuery({ farmId })
  const { data: actuatorTypes } = trpc.actuator.getTypes.useQuery()

  const allMcus = mcus?.map((m:any) => ({
    id:                 m.id,
    name:               m.name,
    fk_irrigationField: irrigationFieldId,
  })) ?? []

  const fieldOptions = fields?.map(f => ({ id: f.id, name: f.name })) ?? []

  // ── Mutations ─────────────────────────────────────────────────
  const invalidate = () => utils.actuator.getAllByFieldFull.invalidate()

  const create = trpc.actuator.create.useMutation({
    onSuccess: () => { invalidate(); setAddOpen(false) }
  })

  const update = trpc.actuator.update.useMutation({
    onSuccess: () => { invalidate(); setEditTarget(null) }
  })

  const remove = trpc.actuator.delete.useMutation({
    onSuccess: () => { invalidate(); setDeleteTarget(null) }
  })

  function handleCreate(form: ActuatorForm) {
    create.mutate({
      name:            form.name,
      macAddress:      form.macAddress || undefined,
      latitude:        parseFloat(form.latitude),
      longitude:       parseFloat(form.longitude),
      targetState:     form.targetState,
      toggleTimeLimit: form.toggleTimeLimit ? parseInt(form.toggleTimeLimit) : null,
      isActive:        form.isActive,
      fk_mcu:          form.fk_mcu || undefined,
      fk_actuatorType: form.fk_actuatorType || undefined,
    })
  }

  function handleUpdate(form: ActuatorForm) {
    if (!editTarget) return
    update.mutate({
      id:              editTarget,
      name:            form.name,
      macAddress:      form.macAddress || undefined,
      latitude:        parseFloat(form.latitude),
      longitude:       parseFloat(form.longitude),
      targetState:     form.targetState,
      toggleTimeLimit: form.toggleTimeLimit ? parseInt(form.toggleTimeLimit) : null,
      isActive:        form.isActive,
      fk_mcu:          form.fk_mcu || undefined,
      fk_actuatorType: form.fk_actuatorType || undefined,
    })
  }

  const editActuator = actuators?.find((a:any) => a.id === editTarget)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            {t("data.actuators.title")}
          </p>
          <select
            value={mcuFilter}
            onChange={e => setMcuFilter(e.target.value)}
            className="h-7 rounded-md border border-border bg-card px-2 text-[12px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">{t("common.allMcus")}</option>
            {mcus?.map((m:any) => (
              <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
            ))}
          </select>
        </div>
        {canCreate && (
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white text-[12px] h-8 px-3 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("data.actuators.add")}
        </Button>
      )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-canvas">
              {[
                "data.actuators.columns.name",
                "data.actuators.columns.type",
                "data.actuators.columns.mcu",
                "data.actuators.columns.field",
                "data.actuators.columns.gps",
                "data.actuators.columns.mac",
                "data.actuators.columns.state",
                "data.actuators.columns.status",
                "data.actuators.columns.lastAction",
                "data.actuators.columns.timeLimit",
                "data.actuators.columns.actions",
              ].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  {t(h as I18nKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(4)].map((_, i) => (
              <tr key={i} className="border-b border-[#F0F7F3] animate-pulse">
                {[...Array(11)].map((_, j) => (
                  <td key={j} className="px-4 py-3.5">
                    <div className="h-3 bg-green-soft rounded w-16" />
                  </td>
                ))}
              </tr>
            ))}

            {!isLoading && actuators?.map((actuator:any) => {
              const lastAction = actuator.lastAction
              const isOpen     = lastAction?.actionVal ?? actuator.targetState

              return (
                <tr key={actuator.id} className="border-b border-[#F0F7F3] hover:bg-canvas transition-colors">

                  {/* Name */}
                  <td className="px-4 py-3.5 font-semibold text-foreground">
                    {actuator.name}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3.5">
                    <TypeTag type={actuator.actuatorType} />
                  </td>

                  {/* MCU */}
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {actuator.mcuName}
                  </td>

                  {/* Field */}
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {actuator.fieldName}
                  </td>

                  {/* GPS */}
                  <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                    {t("common.latitude", { n: actuator.latitude.toFixed(4) })}<br />
                    {t("common.longitude", { n: actuator.longitude.toFixed(4) })}
                  </td>

                  {/* MAC */}
                  <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                    {actuator.macAddress ?? "—"}
                  </td>

                  {/* State */}
                  <td className="px-4 py-3.5">
                    <StateBadge isOpen={isOpen} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusBadge
                      status={actuator.mcuStatus}
                      isActive={actuator.isActive}
                    />
                  </td>

                  {/* Last action */}
                  <td className="px-4 py-3.5 text-[12px] text-muted-foreground">
                    {lastAction
                      ? formatRelative(lastAction.createdAt)
                      : "—"
                    }
                  </td>

                  {/* Time limit */}
                  <td className="px-4 py-3.5 text-[12px] text-muted-foreground">
                    {actuator.toggleTimeLimit
                      ? <span className="font-mono">{t("data.actuators.timeLimit", { n: actuator.toggleTimeLimit })}</span>
                      : "—"
                    }
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {canUpdate && (
                        <button
                          onClick={() => setEditTarget(actuator.id)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(actuator.id)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}

            {!isLoading && actuators?.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  {t("data.actuators.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add modal ── */}
      <ActuatorModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        isLoading={create.isPending}
        title={t("data.actuators.form.titleAdd")}
        fields={fieldOptions}
        mcus={allMcus}
        actuatorTypes={actuatorTypes ?? []}
      />

      {/* ── Edit modal ── */}
      {editActuator && (
        <ActuatorModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          isLoading={update.isPending}
          title={t("data.actuators.form.titleEdit", { name: editActuator.name })}
          fields={fieldOptions}
          mcus={allMcus}
          actuatorTypes={actuatorTypes ?? []}
          initial={{
            name:            editActuator.name,
            macAddress:      editActuator.macAddress ?? "",
            latitude:        String(editActuator.latitude),
            longitude:       String(editActuator.longitude),
            targetState:     editActuator.targetState,
            toggleTimeLimit: editActuator.toggleTimeLimit?.toString() ?? "",
            isActive:        editActuator.isActive,
            fk_mcu:          editActuator.fk_mcu ?? "",
            fk_actuatorType: editActuator.actuatorType ?? "",
          }}
        />
      )}

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{t("data.actuators.delete.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            {t("data.actuators.delete.message")}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
               deleteTarget && remove.mutate({ id: deleteTarget })}}
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