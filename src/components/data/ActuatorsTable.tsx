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

// ── Helpers ───────────────────────────────────────────────────────
function formatRelative(date: Date | string | null): string {
  if (!date) return "—"
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}

// ── Type tag colors ───────────────────────────────────────────────
const typeColors: Record<string, string> = {
  drip_valve: "bg-[#E6F7ED] text-[#2D8653]",
  sprinkler:  "bg-[#EEF2FF] text-[#4F6EF7]",
  pump:       "bg-[#FEF3DC] text-[#B8780E]",
}

function TypeTag({ type }: { type: string }) {
  const color = typeColors[type] ?? "bg-[#F5F5F5] text-[#888]"
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
        : "bg-[#F5F5F5] text-[#888]"
    }`}>
      • {isOpen ? "Open" : "Closed"}
    </Badge>
  )
}

// ── MCU status badge ──────────────────────────────────────────────
function StatusBadge({ status, isActive }: { status: string; isActive: boolean }) {
  if (!isActive) return (
    <Badge className="text-[11px] px-2 py-0.5 border-0 rounded-full bg-[#F5F5F5] text-[#888]">
      • Inactif
    </Badge>
  )
  const map: Record<string, { bg: string; text: string; label: string }> = {
    ONLINE:   { bg: "bg-[#E6F7ED]", text: "text-[#2D8653]", label: "Online" },
    OFFLINE:  { bg: "bg-[#F5F5F5]", text: "text-[#888]",    label: "Offline" },
    SLEEPING: { bg: "bg-[#FEF3DC]", text: "text-[#B8780E]", label: "Warning" },
    ERROR:    { bg: "bg-[#FDEAEA]", text: "text-[#B84040]", label: "Error" },
  }
  const s = map[status] ?? map.OFFLINE
  return (
    <Badge className={`text-[11px] px-2 py-0.5 border-0 rounded-full ${s.bg} ${s.text}`}>
      • {s.label}
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
  isActive:        true,
  fk_mcu:          "",
  fk_actuatorType: "",
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
  const [selectedFieldId, setSelectedFieldId] = useState(
    mcus.find(m => m.id === initial?.fk_mcu)?.fk_irrigationField ?? fields[0]?.id ?? ""
  )

  function set<K extends keyof ActuatorForm>(key: K, val: ActuatorForm[K]) {
    setForm(p => ({ ...p, [key]: val }))
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
              <Label className="text-[12px] text-[#5A7A65]">Nom de l&apos;actionneur</Label>
              <Input
                placeholder="Vanne-A1"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Adresse MAC</Label>
              <Input
                placeholder="AA:BB:CC:DD:EE:FF"
                value={form.macAddress}
                onChange={e => set("macAddress", e.target.value)}
                className="border-[#D6E8DC] font-mono text-[12px] focus-visible:ring-[#4CAF7D]"
              />
            </div>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-[#5A7A65]">Type d&apos;actionneur</Label>
            <select
              value={form.fk_actuatorType}
              onChange={e => set("fk_actuatorType", e.target.value)}
              className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] text-[#1A2E22] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
            >
              <option value="">— Sélectionner un type —</option>
              {actuatorTypes.map(t => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Field → MCU selector */}
          <div className="flex flex-col gap-3 p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
              MCU parent
            </p>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Parcelle</Label>
              <select
                value={selectedFieldId}
                onChange={e => {
                  setSelectedFieldId(e.target.value)
                  set("fk_mcu", "")
                }}
                className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] text-[#1A2E22] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
              >
                <option value="">— Sélectionner une parcelle —</option>
                {fields.map(f => (
                  <option key={f.id} value={f.id}>{f.name ?? f.id}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">MCU</Label>
              <select
                value={form.fk_mcu}
                onChange={e => set("fk_mcu", e.target.value)}
                disabled={!selectedFieldId || filteredMcus.length === 0}
                className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] text-[#1A2E22] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D] disabled:opacity-50"
              >
                <option value="">— Sélectionner un MCU —</option>
                {filteredMcus.map(m => (
                  <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
                ))}
              </select>
              {selectedFieldId && filteredMcus.length === 0 && (
                <p className="text-[11px] text-[#E89B2D]">Aucun MCU dans cette parcelle.</p>
              )}
            </div>
          </div>

          {/* GPS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Latitude</Label>
              <Input
                placeholder="36.4703"
                type="number"
                value={form.latitude}
                onChange={e => set("latitude", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D] font-mono text-[12px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Longitude</Label>
              <Input
                placeholder="2.8277"
                type="number"
                value={form.longitude}
                onChange={e => set("longitude", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D] font-mono text-[12px]"
              />
            </div>
          </div>

          {/* Initial state + isActive */}
          <div className="flex flex-col gap-3">
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
              <div>
                <p className="text-[13px] font-medium text-[#1A2E22]">Actionneur actif</p>
                <p className="text-[11px] text-[#8FAF9A]">Désactiver pour ignorer cet actionneur</p>
              </div>
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

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-[#D6E8DC] text-[#5A7A65]">
            Annuler
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={isLoading || !form.name}
            className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white"
          >
            {isLoading ? "..." : "Sauvegarder"}
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
      isActive:        form.isActive,
      fk_mcu:          form.fk_mcu || undefined,
      fk_actuatorType: form.fk_actuatorType || undefined,
    })
  }

  const editActuator = actuators?.find((a:any) => a.id === editTarget)

  return (
    <div className="bg-white border border-[#D6E8DC] rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#D6E8DC]">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
            Actuators
          </p>
          <select
            value={mcuFilter}
            onChange={e => setMcuFilter(e.target.value)}
            className="h-7 rounded-md border border-[#D6E8DC] bg-white px-2 text-[12px] text-[#5A7A65] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
          >
            <option value="">Tous les MCUs</option>
            {mcus?.map((m:any) => (
              <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white text-[12px] h-8 px-3 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter actionneur
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#D6E8DC] bg-[#F7F9F5]">
              {["NOM", "TYPE", "MCU", "PARCELLE", "GPS", "MAC", "ÉTAT", "STATUT", "DERNIÈRE ACTION", "ACTIONS"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider text-[#8FAF9A]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(4)].map((_, i) => (
              <tr key={i} className="border-b border-[#F0F7F3] animate-pulse">
                {[...Array(10)].map((_, j) => (
                  <td key={j} className="px-4 py-3.5">
                    <div className="h-3 bg-[#E8F4ED] rounded w-16" />
                  </td>
                ))}
              </tr>
            ))}

            {!isLoading && actuators?.map((actuator:any) => {
              const lastAction = actuator.lastAction
              const isOpen     = lastAction?.actionVal ?? actuator.targetState

              return (
                <tr key={actuator.id} className="border-b border-[#F0F7F3] hover:bg-[#F7F9F5] transition-colors">

                  {/* Name */}
                  <td className="px-4 py-3.5 font-semibold text-[#1A2E22]">
                    {actuator.name}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3.5">
                    <TypeTag type={actuator.actuatorType} />
                  </td>

                  {/* MCU */}
                  <td className="px-4 py-3.5 text-[#5A7A65]">
                    {actuator.mcuName}
                  </td>

                  {/* Field */}
                  <td className="px-4 py-3.5 text-[#5A7A65]">
                    {actuator.fieldName}
                  </td>

                  {/* GPS */}
                  <td className="px-4 py-3.5 font-mono text-[11px] text-[#8FAF9A]">
                    {actuator.latitude.toFixed(4)}°N<br />
                    {actuator.longitude.toFixed(4)}°E
                  </td>

                  {/* MAC */}
                  <td className="px-4 py-3.5 font-mono text-[11px] text-[#5A7A65]">
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
                  <td className="px-4 py-3.5 text-[12px] text-[#8FAF9A]">
                    {lastAction
                      ? formatRelative(lastAction.createdAt)
                      : "—"
                    }
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditTarget(actuator.id)}
                        className="h-7 w-7 rounded border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#4CAF7D] hover:border-[#4CAF7D] transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(actuator.id)}
                        className="h-7 w-7 rounded border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {!isLoading && actuators?.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[13px] text-[#8FAF9A]">
                  Aucun actionneur trouvé.
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
        title="Ajouter un actionneur"
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
          title={`Modifier — ${editActuator.name}`}
          fields={fieldOptions}
          mcus={allMcus}
          actuatorTypes={actuatorTypes ?? []}
          initial={{
            name:            editActuator.name,
            macAddress:      editActuator.macAddress ?? "",
            latitude:        String(editActuator.latitude),
            longitude:       String(editActuator.longitude),
            targetState:     editActuator.targetState,
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
            <DialogTitle>Supprimer cet actionneur ?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-[#5A7A65]">
            Toutes les actions et schedules liés seront supprimés.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {console.log('deleteting');
               deleteTarget && remove.mutate({ id: deleteTarget })}}
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