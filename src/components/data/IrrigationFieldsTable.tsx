"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, MapPin, Plus } from "lucide-react"
import { t, type I18nKey } from "@/i18n"
import { usePermissions } from "@/hooks/use-permissions"

const COLUMN_HEADERS: I18nKey[] = [
  "data.fields.columns.name",
  "data.fields.columns.crop",
  "data.fields.columns.surface",
  "data.fields.columns.gps",
  "data.fields.columns.mcus",
  "data.fields.columns.moisture",
  "data.fields.columns.status",
  "data.fields.columns.actions",
]

// ── Moisture bar ──────────────────────────────────────────────────
function MoistureBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[12px] text-muted-foreground">—</span>

  const color =
    value < 30 ? "bg-[#D95F5F]" :
    value < 50 ? "bg-[#E89B2D]" :
    "bg-primary"

  const textColor =
    value < 30 ? "text-[#D95F5F]" :
    value < 50 ? "text-[#E89B2D]" :
    "text-primary"

  return (
    <div className="flex items-center gap-2">
      <div className="w-[80px] h-[6px] bg-green-soft rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className={`text-[12px] font-semibold ${textColor}`}>
        {value}%
      </span>
    </div>
  )
}

// ── Add/Edit modal ────────────────────────────────────────────────
type FieldForm = {
  name:      string
  crop:  string
  surface:      string
  latitude:  string
  longitude: string
}

const emptyForm: FieldForm = {
  name:      "",
  crop:  "",
  surface:      "",
  latitude:  "",
  longitude: "",
}

function FieldModal({
  open,
  onClose,
  onSubmit,
  initial,
  isLoading,
  title,
}: {
  open:      boolean
  onClose:   () => void
  onSubmit:  (form: FieldForm) => void
  initial?:  FieldForm
  isLoading: boolean
  title:     string
}) {
  const [form, setForm] = useState<FieldForm>(initial ?? emptyForm)

  function set(key: keyof FieldForm, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{t("data.fields.form.name")}</Label>
            <Input
              placeholder={t("data.fields.form.namePlaceholder")}
              value={form.name}
              onChange={e => set("name", e.target.value)}
              className="border-border focus-visible:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{t("data.fields.form.crop")}</Label>
            <Input
              placeholder={t("data.fields.form.cropPlaceholder")}
              value={form.crop}
              onChange={e => set("crop", e.target.value)}
              className="border-border focus-visible:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{t("data.fields.form.surface")}</Label>
            <Input
              placeholder={t("data.fields.form.surfacePlaceholder")}
              type="number"
              value={form.surface}
              onChange={e => set("surface", e.target.value)}
              className="border-border focus-visible:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.fields.form.lat")}</Label>
              <Input
                placeholder={t("data.fields.form.latPlaceholder")}
                type="number"
                value={form.latitude}
                onChange={e => set("latitude", e.target.value)}
                className="border-border focus-visible:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.fields.form.lon")}</Label>
              <Input
                placeholder={t("data.fields.form.lonPlaceholder")}
                type="number"
                value={form.longitude}
                onChange={e => set("longitude", e.target.value)}
                className="border-border focus-visible:ring-primary"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border text-muted-foreground"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={isLoading || !form.name}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isLoading ? "..." : title.includes("Ajouter") ? t("common.add") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main table ────────────────────────────────────────────────────
export function IrrigationFieldsTable({ farmId }: { farmId: string }) {
  const utils = trpc.useUtils()
  const { canCreate, canUpdate, canDelete } = usePermissions("irrigationField")

  const [addOpen,    setAddOpen]    = useState(false)
  const [editTarget, setEditTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // ── Queries ───────────────────────────────────────────────────
  const { data: fields, isLoading } = trpc.irrigationField.getAllByFarm.useQuery(
    { farmId },
    { refetchInterval: 30000 }
  )

  // ── Mutations ─────────────────────────────────────────────────
  // this is used to refresh data on change
  const invalidate = () => utils.irrigationField.getAllByFarm.invalidate()

  const create = trpc.irrigationField.create.useMutation({
    onSuccess: () => { invalidate(); setAddOpen(false) }
  })
//here we can add the needed data later
  const update = trpc.irrigationField.update.useMutation({
    onSuccess: () => { invalidate(); setEditTarget(null) }
  })

  const remove = trpc.irrigationField.delete.useMutation({
    onSuccess: () => { invalidate(); setDeleteTarget(null) }
  })

  // ── Helpers ───────────────────────────────────────────────────
  function handleCreate(form: FieldForm) {
    create.mutate({
      farmId,
      name:      form.name,
      crop:  form.crop || undefined,
      surface:      form.surface ? parseFloat(form.surface) : undefined,
      latitude:  parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
    })
  }

  function handleUpdate(form: FieldForm) {
    if (!editTarget) return
    update.mutate({
      id:        editTarget,
      name:      form.name,
      crop:  form.crop || undefined,
      surface:      form.surface ? parseFloat(form.surface) : undefined,
      latitude:  parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
    })
  }

  const editField = fields?.find(f => f.id === editTarget)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* ── Table header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("data.fields.title")}
        </p>
        {canCreate && (
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white text-[12px] h-8 px-3 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("data.fields.add")}
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-canvas">
              {COLUMN_HEADERS.map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="border-b border-[#F0F7F3] animate-pulse">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="h-3 bg-green-soft rounded w-20" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!isLoading && fields?.map((field) => (
              <tr
                key={field.id}
                className="border-b border-[#F0F7F3] hover:bg-canvas transition-colors"
              >
                {/* Name */}
                <td className="px-4 py-3.5 font-semibold text-foreground">
                  {field.name ?? "—"}
                </td>

                {/* Crop */}
                <td className="px-4 py-3.5 text-primary font-medium">
                  {field.crop ?? "—"}
                </td>

                {/* surface */}
                <td className="px-4 py-3.5 text-muted-foreground">
                  {field.surface ? t("data.fields.surface", { n: field.surface }) : "—"}
                </td>

                {/* GPS */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="text-[11px] font-mono">
                      {t("common.latitude", { n: field.latitude.toFixed(2) })}<br />
                      {t("common.longitude", { n: field.longitude.toFixed(2) })}
                    </span>
                  </div>
                </td>

                {/* MCU count */}
                <td className="px-4 py-3.5 font-semibold text-foreground">
                  {field.mcuCount}
                </td>

                {/* Moisture */}
                <td className="px-4 py-3.5">
                  <MoistureBar value={field.avgMoisture} />
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <Badge className={`text-[11px] px-2 py-0.5 border-0 rounded-full ${
                    field.isActive
                      ? "bg-[#E6F7ED] text-[#2D8653]"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {field.isActive
                      ? `• ${t("data.fields.status.active")}`
                      : `• ${t("data.fields.status.inactive")}`}
                  </Badge>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {canUpdate && (
                      <button
                        onClick={() => setEditTarget(field.id)}
                        className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteTarget(field.id)}
                        className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!isLoading && fields?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  {t("data.fields.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add modal ── */}
      <FieldModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        isLoading={create.isPending}
        title={t("data.fields.form.titleAdd")}
      />

      {/* ── Edit modal ── */}
      {editField && (
        <FieldModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          isLoading={update.isPending}
          title={t("data.fields.form.titleEdit")}
          initial={{
            name:      editField.name      ?? "",
            crop:  editField.crop  ?? "",
            surface:      editField.surface      ? String(editField.surface) : "",
            latitude:  String(editField.latitude),
            longitude: String(editField.longitude),
          }}
        />
      )}

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">{t("data.fields.delete.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            {t("data.fields.delete.message")}
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-border"
            >
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