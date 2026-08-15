// src/app/(dashboard)/parameters/page.tsx
"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import {
  User, MapPin, Phone, Calendar,
  Pencil, Leaf, CheckCircle, XCircle,
} from "lucide-react"
import { useFieldStore } from "@/store/field-store"


let FARM_ID: any;

// ── Info tile ─────────────────────────────────────────────────────
function InfoTile({
  icon: Icon, label, value
}: {
  icon:  React.ElementType
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F7F9F5] border border-[#E8F4ED]">
      <div className="h-9 w-9 rounded-lg bg-white border border-[#D6E8DC] flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-[#4CAF7D]" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-[#8FAF9A] uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-[14px] text-[#1A2E22] font-medium">
          {value ?? "—"}
        </p>
      </div>
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────
type FarmForm = {
  name:        string
  address:     string
  description: string
  fk_wilaya:   string
  isActive:    boolean
}

function EditFarmModal({
  open, onClose, onSubmit, initial, isLoading, wilayas,
}: {
  open:      boolean
  onClose:   () => void
  onSubmit:  (form: FarmForm) => void
  initial:   FarmForm
  isLoading: boolean
  wilayas:   { id: string; name: string; code: string }[]
}) {
  const [form, setForm] = useState<FarmForm>(initial)

  function set<K extends keyof FarmForm>(key: K, val: FarmForm[K]) {
    setForm(p => ({ ...p, [key]: val }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">
            Modifier FarmingUnite
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-[#5A7A65]">Nom de la ferme</Label>
            <Input
              placeholder="Ferme El Baraka"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
            />
          </div>

          {/* Wilaya */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-[#5A7A65]">Wilaya</Label>
            <select
              value={form.fk_wilaya}
              onChange={e => set("fk_wilaya", e.target.value)}
              className="h-10 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] text-[#1A2E22] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
            >
              <option value="">— Sélectionner une wilaya —</option>
              {wilayas.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-[#5A7A65]">Adresse</Label>
            <Input
              placeholder="Route nationale 29, Beni Mered, Blida"
              value={form.address}
              onChange={e => set("address", e.target.value)}
              className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-[#5A7A65]">Description</Label>
            <textarea
              placeholder="Exploitation maraîchère — tomates, pommes de terre, légumes..."
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[#D6E8DC] bg-[#F7F9F5] px-3 py-2 text-[13px] text-[#1A2E22] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D] resize-none"
            />
          </div>

          {/* isActive */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <div>
              <p className="text-[13px] font-medium text-[#1A2E22]">Ferme active</p>
              <p className="text-[11px] text-[#8FAF9A]">Désactiver pour masquer cette ferme</p>
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
            disabled={isLoading || !form.name}
            className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white gap-2"
          >
            {isLoading ? "..." : (
              <>
                <Pencil className="h-3.5 w-3.5" />
                Sauvegarder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function ParametersPage() {
  const { selectedField, setField, setFields } = useFieldStore();

  FARM_ID = selectedField?.fk_FarmingUnit ?? "Unnamed farm";
  
  const utils = trpc.useUtils()
  const [editOpen, setEditOpen] = useState(false)

  const { data: farm, isLoading } = trpc.farmingUnit.getById.useQuery(
    { id: FARM_ID }
  )

  const { data: wilayas } = trpc.farmingUnit.getWilayas.useQuery()

  const update = trpc.farmingUnit.update.useMutation({
    onSuccess: () => {
      utils.farmingUnit.getById.invalidate()
      setEditOpen(false)
    }
  })

  function handleUpdate(form: FarmForm) {
    update.mutate({
      id:          FARM_ID,
      name:        form.name,
      address:     form.address   || undefined,
      description: form.description || undefined,
      fk_wilaya:   form.fk_wilaya || undefined,
      isActive:    form.isActive,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-[120px] bg-white border border-[#D6E8DC] rounded-xl" />
        <div className="h-[200px] bg-white border border-[#D6E8DC] rounded-xl" />
      </div>
    )
  }

  if (!farm) return (
    <div className="text-center text-[#8FAF9A] py-12">
      Ferme introuvable.
    </div>
  )

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Hero card ── */}
      <div className="rounded-xl overflow-hidden border border-[#D6E8DC]">

        {/* Green header */}
        <div className="bg-[#1A3C2E] px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#4CAF7D] flex items-center justify-center">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-white font-serif">
                {farm.name ?? "—"}
              </h1>
              <p className="text-[13px] text-[#A8D5B5]">
                FarmingUnite · {farm.wilaya?.name ?? "—"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setEditOpen(true)}
            variant="outline"
            className="border-white/30 text-white bg-white/10 hover:bg-white/20 gap-2 text-[13px]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </Button>
        </div>

        {/* Info tiles grid */}
        <div className="bg-white p-5 grid grid-cols-2 gap-3">
          <InfoTile
            icon={User}
            label="Propriétaire"
            value={farm.owner?.name ?? farm.owner?.email}
          />
          <InfoTile
            icon={MapPin}
            label="Adresse"
            value={farm.address}
          />
          <InfoTile
            icon={Calendar}
            label="Créé le"
            value={new Date(farm.createdAt).toLocaleDateString("fr-DZ", {
              year: "numeric", month: "2-digit", day: "2-digit"
            })}
          />
          <InfoTile
            icon={farm.isActive ? CheckCircle : XCircle}
            label="Statut"
            value={farm.isActive ? "Active" : "Inactive"}
          />
        </div>

        {/* Description */}
        {farm.description && (
          <div className="bg-white border-t border-[#D6E8DC] px-5 py-4 pb-5">
            <p className="text-[11px] font-semibold text-[#8FAF9A] uppercase tracking-wider mb-2">
              Description
            </p>
            <p className="text-[13px] text-[#5A7A65] leading-relaxed">
              {farm.description}
            </p>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Parcelles",    value: farm._count.irrigationFields, color: "border-l-[#4CAF7D]" },
          { label: "Wilaya",       value: farm.wilaya?.name ?? "—",     color: "border-l-[#6BA3D6]" },
          { label: "Code wilaya",  value: farm.wilaya?.code ?? "—",     color: "border-l-[#E89B2D]" },
        ].map(s => (
          <div
            key={s.label}
            className={`bg-white border border-[#D6E8DC] rounded-xl p-4 border-l-4 ${s.color}`}
          >
            <p className="text-[11px] text-[#8FAF9A] uppercase tracking-wider mb-1">
              {s.label}
            </p>
            <p className="text-[22px] font-bold text-[#1A2E22] font-serif">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Edit modal ── */}
      {farm && (
        <EditFarmModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSubmit={handleUpdate}
          isLoading={update.isPending}
          wilayas={wilayas ?? []}
          initial={{
            name:        farm.name        ?? "",
            address:     farm.address     ?? "",
            description: farm.description ?? "",
            fk_wilaya:   farm.fk_wilaya   ?? "",
            isActive:    farm.isActive,
          }}
        />
      )}

    </div>
  )
}