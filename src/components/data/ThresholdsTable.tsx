"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2 } from "lucide-react"

function ActionBadge({ action }: { action: boolean | null }) {
  if (action === null || action === undefined) return <span className="text-[#8FAF9A]">—</span>
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
      action
        ? "bg-[#E6F7ED] text-[#2D8653]"   // open = green
        : "bg-[#FDEAEA] text-[#B84040]"   // close = red
    }`}>
      {action ? "↑ Ouvrir" : "↓ Fermer"}
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
              <Label className="text-[12px] text-[#5A7A65]">Nom</Label>
              <Input
                placeholder="Gel protection"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Priorité</Label>
              <Input
                type="number"
                min={1}
                value={form.priority}
                onChange={e => set("priority", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
              />
              <p className="text-[10px] text-[#8FAF9A]">
                1 = Le dernier qui sera verifier
              </p>
            </div>
          </div>

          {/* Sensor + Actuator */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Capteur surveillé</Label>
              <select
                value={form.fk_sensor}
                onChange={e => set("fk_sensor", e.target.value)}
                className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
              >
                <option value="">— Sélectionner —</option>
                {sensors.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.fk_sensorType ?? "?"})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Actionneur contrôlé</Label>
              <select
                value={form.fk_actuator}
                onChange={e => set("fk_actuator", e.target.value)}
                className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
              >
                <option value="">— Sélectionner —</option>
                {actuators.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Min condition */}
          <div className="flex flex-col gap-2 p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <p className="text-[10px] font-semibold text-[#8FAF9A] uppercase tracking-wider">
              Condition MIN — si valeur &lt; seuil
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] text-[#5A7A65]">Seuil min</Label>
                <Input
                  type="number"
                  placeholder="ex: 30"
                  value={form.minValue}
                  onChange={e => set("minValue", e.target.value)}
                  className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] text-[#5A7A65]">Action</Label>
                <select
                  value={form.minValueAction}
                  onChange={e => set("minValueAction", e.target.value as ThresholdForm["minValueAction"])}
                  className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
                >
                  <option value="">— Aucune action —</option>
                  <option value="true">↑ Ouvrir</option>
                  <option value="false">↓ Fermer</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-[#8FAF9A]">
              Ex: humidité &lt; 30% → ouvrir la vanne
            </p>
          </div>

          {/* Max condition */}
          <div className="flex flex-col gap-2 p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <p className="text-[10px] font-semibold text-[#8FAF9A] uppercase tracking-wider">
              Condition MAX — si valeur &gt; seuil
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] text-[#5A7A65]">Seuil max</Label>
                <Input
                  type="number"
                  placeholder="ex: 80"
                  value={form.maxValue}
                  onChange={e => set("maxValue", e.target.value)}
                  className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] text-[#5A7A65]">Action</Label>
                <select
                  value={form.maxValueAction}
                  onChange={e => set("maxValueAction", e.target.value as ThresholdForm["maxValueAction"])}
                  className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
                >
                  <option value="">— Aucune action —</option>
                  <option value="true">↑ Ouvrir</option>
                  <option value="false">↓ Fermer</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-[#8FAF9A]">
              Ex: température &lt; 0°C → fermer la vanne (antigel)
            </p>
          </div>

          {/* isActive */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <p className="text-[13px] font-medium text-[#1A2E22]">Seuil actif</p>
            <button
              onClick={() => set("isActive", !form.isActive)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                form.isActive ? "bg-[#4CAF7D]" : "bg-[#D6E8DC]"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${
                form.isActive ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
          </div>

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-[#D6E8DC]">
            Annuler
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={isLoading || !form.fk_sensor || !form.fk_actuator}
            className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white"
          >
            {isLoading ? "..." : "Enregistrer"}
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
    { enabled: !!irrigationFieldId }
  )

  const { data: sensors }   = trpc.sensor.getAllByField.useQuery(
    { irrigationFieldId },
    { enabled: !!irrigationFieldId }
  )
  const { data: actuators } = trpc.actuator.getAllByField.useQuery(
    { irrigationFieldId },
    { enabled: !!irrigationFieldId }
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
    <div className="bg-white border border-[#D6E8DC] rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#D6E8DC]">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
              Seuils automatiques
            </p>
            <p className="text-[11px] text-[#8FAF9A] mt-0.5">
              Appliqués par ordre de priorité
            </p>
          </div>

          {/* Actuator filter */}
          <select
            value={actuatorFilter}
            onChange={e => setActuatorFilter(e.target.value)}
            className="h-7 rounded-md border border-[#D6E8DC] bg-white px-2 text-[12px] text-[#5A7A65] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
          >
            <option value="">Tous les actionneurs</option>
            {actuators?.map((a:any) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white text-[12px] h-8 px-3 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter seuil
        </Button>
      </div>

      {/* No field selected */}
      {!irrigationFieldId && (
        <div className="px-4 py-8 text-center text-[13px] text-[#8FAF9A]">
          Sélectionnez une parcelle dans la barre du haut pour voir les seuils.
        </div>
      )}

      {/* Table */}
      {irrigationFieldId && (
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#D6E8DC] bg-[#F7F9F5]">
              {["PRIO", "NOM", "CAPTEUR", "ACTIONNEUR", "SI < MIN", "SI > MAX", "STATUT", "ACTIONS"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider text-[#8FAF9A]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(3)].map((_, i) => (
              <tr key={i} className="border-b border-[#F0F7F3] animate-pulse">
                {[...Array(8)].map((_, j) => (
                  <td key={j} className="px-4 py-3.5">
                    <div className="h-3 bg-[#E8F4ED] rounded w-16" />
                  </td>
                ))}
              </tr>
            ))}

            {!isLoading && filtered?.map((t:any) => (
              <tr key={t.id} className="border-b border-[#F0F7F3] hover:bg-[#F7F9F5] transition-colors">

                {/* Priority */}
                <td className="px-4 py-3.5">
                  <span className="h-6 w-6 rounded-full bg-[#1A3C2E] text-white text-[11px] font-bold flex items-center justify-center">
                    {t.priority}
                  </span>
                </td>

                {/* Name */}
                <td className="px-4 py-3.5 font-medium text-[#1A2E22]">
                  {t.name ?? "—"}
                </td>

                {/* Sensor */}
                <td className="px-4 py-3.5 text-[#5A7A65]">
                  <div>{t.sensor.name}</div>
                  <div className="text-[10px] text-[#8FAF9A]">
                    {t.sensor.fk_sensorType}
                  </div>
                </td>

                {/* Actuator */}
                <td className="px-4 py-3.5 text-[#5A7A65]">
                  <div>{t.actuator.name}</div>
                  <div className="text-[10px] text-[#8FAF9A]">
                    {t.actuator.actuatorType?.name}
                  </div>
                </td>

                {/* Min condition */}
                <td className="px-4 py-3.5">
                  {t.minValue !== null && t.minValue !== undefined ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-mono text-[#1A2E22]">
                        &lt; {t.minValue}
                      </span>
                      <ActionBadge action={t.minValueAction} />
                    </div>
                  ) : (
                    <span className="text-[#8FAF9A]">—</span>
                  )}
                </td>

                {/* Max condition */}
                <td className="px-4 py-3.5">
                  {t.maxValue !== null && t.maxValue !== undefined ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-mono text-[#1A2E22]">
                        &gt; {t.maxValue}
                      </span>
                      <ActionBadge action={t.maxValueAction} />
                    </div>
                  ) : (
                    <span className="text-[#8FAF9A]">—</span>
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
                        : "bg-[#F5F5F5] text-[#888] hover:bg-[#E6F7ED] hover:text-[#2D8653]"
                    }`}
                  >
                    {t.isActive ? "• Actif" : "• Inactif"}
                  </button>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditTarget(t.id)}
                      className="h-7 w-7 rounded border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#4CAF7D] hover:border-[#4CAF7D] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t.id)}
                      className="h-7 w-7 rounded border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!isLoading && filtered?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-[#8FAF9A]">
                  {actuatorFilter
                    ? "Aucun seuil pour cet actionneur."
                    : "Aucun seuil configuré. Cliquez sur Ajouter seuil pour commencer."
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
        title="Ajouter un seuil"
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
          title={`Modifier — ${editThreshold.name ?? "Seuil"}`}
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
            <DialogTitle>Supprimer ce seuil ?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-[#5A7A65]">
            Le seuil sera supprimé et le MCU mis à jour immédiatement.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => deleteTarget && remove.mutate({ id: deleteTarget })}
              disabled={remove.isPending}
              className="bg-[#D95F5F] hover:bg-[#C04040] text-white"
            >
              {remove.isPending ? "..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}