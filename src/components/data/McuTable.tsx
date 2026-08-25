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
import {
  Pencil,
  Trash2,
  Plus,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────
type MCUStatus = "ONLINE" | "OFFLINE" | "SLEEPING" | "ERROR";

type McuForm = {
  name: string;
  macAddress: string;
  sleepingTime: string;
  minSoilMoisture: string;
  maxSoilMoisture: string;
  autoControlledIrrigation: boolean;
  isActive: boolean;
  fk_irrigationField: string;
};

const emptyForm: McuForm = {
  name: "",
  macAddress: "",
  sleepingTime: "30",
  minSoilMoisture: "20",
  maxSoilMoisture: "80",
  autoControlledIrrigation: true,
  isActive: true,
  fk_irrigationField: "",
};

// ── Status badge ──────────────────────────────────────────────────
function StatusBadge({
  status,
  isActive,
}: {
  status: MCUStatus;
  isActive: boolean;
}) {
  if (!isActive)
    return (
      <Badge className="text-[11px] px-2 py-0.5 border-0 rounded-full bg-[#F5F5F5] text-[#888]">
        • Inactif
      </Badge>
    );

  const map = {
    ONLINE: { bg: "bg-[#E6F7ED]", text: "text-[#2D8653]", label: "Online" },
    OFFLINE: { bg: "bg-[#F5F5F5]", text: "text-[#888]", label: "Offline" },
    SLEEPING: { bg: "bg-[#FEF3DC]", text: "text-[#B8780E]", label: "Warning" },
    ERROR: { bg: "bg-[#FDEAEA]", text: "text-[#B84040]", label: "Error" },
  };

  const s = map[status] ?? map.OFFLINE;
  return (
    <Badge
      className={`text-[11px] px-2 py-0.5 border-0 rounded-full ${s.bg} ${s.text}`}
    >
      • {s.label}
    </Badge>
  );
}

// ── Mode badge ────────────────────────────────────────────────────
function ModeBadge({ auto }: { auto: boolean }) {
  return (
    <Badge
      className={`text-[11px] px-2 py-0.5 border-0 rounded-full ${
        auto ? "bg-[#E6F7ED] text-[#2D8653]" : "bg-[#EEF2FF] text-[#4F6EF7]"
      }`}
    >
      • {auto ? "Auto" : "Manual"}
    </Badge>
  );
}

// ── Format relative time ──────────────────────────────────────────
function formatRelative(date: Date | string | null): string {
  if (!date) return "—";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Moisture range visual ─────────────────────────────────────────
function MoistureRange({ min, max }: { min: number; max: number }) {
  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <div className="relative h-[5px] bg-[#E8F4ED] rounded-full w-full">
        <div
          className="absolute h-full bg-gradient-to-r from-[#E89B2D] to-[#4CAF7D] rounded-full"
          style={{ left: `${min}%`, width: `${max - min}%` }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] text-[#E89B2D] font-medium">{min}%</span>
        <span className="text-[10px] text-[#4CAF7D] font-medium">{max}%</span>
      </div>
    </div>
  );
}

// ── MCU Form Modal ────────────────────────────────────────────────
function McuModal({
  open,
  onClose,
  onSubmit,
  initial,
  isLoading,
  title,
  fields,
  defaultFieldId,
  newApiKey,
  onRegenerateKey,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: McuForm) => void;
  initial?: McuForm;
  isLoading: boolean;
  title: string;
  fields: { id: string; name: string | null }[];
  defaultFieldId: string;
  newApiKey?: string;
  onRegenerateKey?: () => void;
}) {
  const [form, setForm] = useState<McuForm>(
    initial ?? { ...emptyForm, fk_irrigationField: defaultFieldId }
  );
  const [showKey, setShowKey] = useState(false);

  function set<K extends keyof McuForm>(key: K, val: McuForm[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  // Moisture range preview
  const min = parseFloat(form.minSoilMoisture) || 0;
  const max = parseFloat(form.maxSoilMoisture) || 100;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* ── Name + MAC ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Nom du MCU</Label>
              <Input
                placeholder="MCU-01"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Adresse MAC</Label>
              <Input
                placeholder="AA:BB:CC:DD:EE:FF"
                value={form.macAddress}
                onChange={(e) => set("macAddress", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D] font-mono text-[12px]"
              />
            </div>
          </div>

          {/* ── Irrigation field selector ── */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-[#5A7A65]">
              Parcelle associée
            </Label>
            <select
              value={form.fk_irrigationField}
              onChange={(e) => set("fk_irrigationField", e.target.value)}
              className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] text-[#1A2E22] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
            >
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name ?? f.id}
                </option>
              ))}
            </select>
          </div>

          {/* ── Mode ── */}
          <div className="flex flex-col gap-2">
            <Label className="text-[12px] text-[#5A7A65]">
              Mode de contrôle
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={form.autoControlledIrrigation}
                  onChange={() => set("autoControlledIrrigation", true)}
                  className="accent-[#4CAF7D]"
                />
                <span className="text-[13px] text-[#1A2E22]">Automatique</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={!form.autoControlledIrrigation}
                  onChange={() => set("autoControlledIrrigation", false)}
                  className="accent-[#4CAF7D]"
                />
                <span className="text-[13px] text-[#1A2E22]">Manuel</span>
              </label>
            </div>
          </div>

          {/* ── isActive ── */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <div>
              <p className="text-[13px] font-medium text-[#1A2E22]">
                MCU Actif
              </p>
              <p className="text-[11px] text-[#8FAF9A]">
                Désactiver pour ignorer ce MCU
              </p>
            </div>
            <button
              onClick={() => set("isActive", !form.isActive)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                form.isActive ? "bg-[#4CAF7D]" : "bg-[#D6E8DC]"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${
                  form.isActive ? "translate-x-4.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* ── Sleeping time ── */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-[#5A7A65]">
              Taux de mise à jour (secondes)
            </Label>
            <Input
              placeholder="30"
              type="number"
              value={form.sleepingTime}
              onChange={(e) => set("sleepingTime", e.target.value)}
              className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
            />
          </div>

          {/* ── Soil moisture thresholds ── */}
          <div className="flex flex-col gap-3 p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
              Seuils d&apos;humidité
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] text-[#5A7A65]">
                  minSoilMoisture (%)
                </Label>
                <Input
                  placeholder="20"
                  type="number"
                  min={0}
                  max={100}
                  value={form.minSoilMoisture}
                  onChange={(e) => set("minSoilMoisture", e.target.value)}
                  className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] text-[#5A7A65]">
                  maxSoilMoisture (%)
                </Label>
                <Input
                  placeholder="80"
                  type="number"
                  min={0}
                  max={100}
                  value={form.maxSoilMoisture}
                  onChange={(e) => set("maxSoilMoisture", e.target.value)}
                  className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
                />
              </div>
            </div>

            {/* Live range preview */}
            <div className="relative h-[6px] bg-[#E8F4ED] rounded-full">
              <div
                className="absolute h-full bg-gradient-to-r from-[#E89B2D] to-[#4CAF7D] rounded-full transition-all"
                style={{ left: `${min}%`, width: `${Math.max(max - min, 0)}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-[#E89B2D] font-medium">
                Min: {min}%
              </span>
              <span className="text-[11px] text-[#4CAF7D] font-medium">
                Max: {max}%
              </span>
            </div>
          </div>

          {/* ── API Key section (edit mode only) ── */}
          {initial && (
            <div className="flex flex-col gap-2 p-3 rounded-lg border border-[#D95F5F]/30 bg-[#FDEAEA]/40">
              <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
                Clé API
              </p>
              <p className="text-[12px] text-[#5A7A65]">
                La clé actuelle est masquée pour des raisons de sécurité.
                Régénérez-en une nouvelle si le MCU est compromis.
              </p>
              <Button
                variant="outline"
                onClick={onRegenerateKey}
                className="border-[#D95F5F] text-[#D95F5F] hover:bg-[#FDEAEA] gap-2 text-[12px] h-8 w-fit"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Générer une nouvelle clé API
              </Button>
            </div>
          )}
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
            className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white"
          >
            {isLoading
              ? "..."
              : title.includes("Ajouter")
              ? "Ajouter"
              : "Sauvegarder configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main MCU Table ────────────────────────────────────────────────
export function MCUsTable({
  irrigationFieldId,
  farmId,
}: {
  irrigationFieldId: string;
  farmId: string;
}) {
  const utils = trpc.useUtils();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | undefined>();
  const [apiKeyModal, setApiKeyModal] = useState<{
    mcuName: string;
    apiKey: string;
  } | null>(null);
  const [showGeneratedKey, setShowGeneratedKey] = useState(false);
  const [confirmRegenTarget, setConfirmRegenTarget] = useState<string | null>(
    null
  );

  // ── Fetch MCUs ────────────────────────────────────────────────
  const { data: mcus, isLoading } = trpc.mcu.getAllMcus.useQuery(
    { irrigationFieldId },
    { refetchInterval: 30000 }
  );

  // ── Fetch all fields for selector ─────────────────────────────
  const { data: fields } = trpc.irrigationField.getAllByFarm.useQuery({
    farmId,
  });

  const fieldOptions = fields?.map((f) => ({ id: f.id, name: f.name })) ?? [];

  // ── Mutations ─────────────────────────────────────────────────
  const invalidate = () => utils.mcu.getAllMcus.invalidate();

  const create = trpc.mcu.create.useMutation({
    onSuccess: (data) => {
      invalidate();
      setAddOpen(false);
      // Show new apiKey to user — only time it's visible
      if (data.apiKey) {
        setNewApiKey(data.apiKey);
        setEditTarget(data.id);
      }
    },
  });

  const update = trpc.mcu.update.useMutation({
    onSuccess: () => {
      invalidate();
      setEditTarget(null);
      setNewApiKey(undefined);
    },
  });

  const remove = trpc.mcu.delete.useMutation({
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });
  const regenerateKey = trpc.mcu.regenerateApiKey.useMutation({
    onSuccess: (data, variables) => {
      const mcu = mcus?.find((m: any) => m.id === variables.id);
      setConfirmRegenTarget(null);
      setApiKeyModal({
        mcuName: mcu?.name ?? "MCU",
        apiKey: data.apiKey,
      });
      setShowGeneratedKey(false);
    },
  });

  // ── Helpers ───────────────────────────────────────────────────
  function handleCreate(form: McuForm) {
    create.mutate({
      fk_irrigationField: form.fk_irrigationField || irrigationFieldId,
      name: form.name,
      macAddress: form.macAddress || undefined,
      sleepingTime: parseFloat(form.sleepingTime),
      minSoilMoisture: parseFloat(form.minSoilMoisture),
      maxSoilMoisture: parseFloat(form.maxSoilMoisture),
      autoControlledIrrigation: form.autoControlledIrrigation,
      isActive: form.isActive,
    });
  }

  function handleUpdate(form: McuForm) {
    if (!editTarget) return;
    update.mutate({
      id: editTarget,
      name: form.name,
      macAddress: form.macAddress || undefined,
      sleepingTime: parseFloat(form.sleepingTime),
      minSoilMoisture: parseFloat(form.minSoilMoisture),
      maxSoilMoisture: parseFloat(form.maxSoilMoisture),
      autoControlledIrrigation: form.autoControlledIrrigation,
      isActive: form.isActive,
      fk_irrigationField: form.fk_irrigationField || irrigationFieldId,
    });
  }

  const editMcu = mcus?.find((m: any) => m.id === editTarget);

  return (
    <div className="bg-white border border-[#D6E8DC] rounded-xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#D6E8DC]">
        <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase">
          MCU Devices
        </p>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white text-[12px] h-8 px-3 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />+ Enregistrer MCU
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#D6E8DC] bg-[#F7F9F5]">
              {[
                "NOM",
                "MAC",
                "MODE",
                "HUMIDITÉ",
                "VEILLE",
                "STATUT",
                "VU LE",
                "ACTIONS",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider text-[#8FAF9A]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              [...Array(3)].map((_, i) => (
                <tr key={i} className="border-b border-[#F0F7F3] animate-pulse">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="h-3 bg-[#E8F4ED] rounded w-16" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading &&
              mcus?.map((mcu: any) => (
                <tr
                  key={mcu.id}
                  className="border-b border-[#F0F7F3] hover:bg-[#F7F9F5] transition-colors"
                >
                  {/* Name */}
                  <td className="px-4 py-3.5 font-semibold text-[#1A2E22]">
                    {mcu.name ?? "—"}
                  </td>

                  {/* MAC */}
                  <td className="px-4 py-3.5 font-mono text-[11px] text-[#5A7A65]">
                    {mcu.macAddress ?? "—"}
                  </td>

                  {/* Mode */}
                  <td className="px-4 py-3.5">
                    <ModeBadge auto={mcu.autoControlledIrrigation} />
                  </td>

                  {/* Moisture range */}
                  <td className="px-4 py-3.5">
                    <MoistureRange
                      min={mcu.minSoilMoisture}
                      max={mcu.maxSoilMoisture}
                    />
                  </td>

                  {/* Sleeping time */}
                  <td className="px-4 py-3.5 text-[#5A7A65]">
                    {mcu.sleepingTime}s
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusBadge
                      status={mcu.status as MCUStatus}
                      isActive={mcu.isActive}
                    />
                  </td>

                  {/* Last seen */}
                  <td className="px-4 py-3.5 text-[12px] text-[#8FAF9A]">
                    {formatRelative(mcu.updatedAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditTarget(mcu.id)}
                        className="h-7 w-7 rounded border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#4CAF7D] hover:border-[#4CAF7D] transition-colors"
                        title="Configurer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(mcu.id)}
                        className="h-7 w-7 rounded border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!isLoading && mcus?.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-[13px] text-[#8FAF9A]"
                >
                  Aucun MCU enregistré. Cliquez sur &quot;+ Enregistrer
                  MCU&quot; pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add modal ── */}
      <McuModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        isLoading={create.isPending}
        title="Ajouter un MCU"
        fields={fieldOptions}
        defaultFieldId={irrigationFieldId}
      />

      {/* ── Edit modal ── */}
      {editMcu && (
        <McuModal
          open={!!editTarget}
          onClose={() => {
            setEditTarget(null);
            setNewApiKey(undefined);
          }}
          onSubmit={handleUpdate}
          isLoading={update.isPending}
          title={`Configuration — ${editMcu.name}`}
          fields={fieldOptions}
          defaultFieldId={editMcu.fk_irrigationField ?? irrigationFieldId}
          onRegenerateKey={() => {
            setEditTarget(null)                    // close config modal
            setConfirmRegenTarget(editMcu.id)      // open confirm dialog
          }}
          initial={{
            name: editMcu.name ?? "",
            macAddress: editMcu.macAddress ?? "",
            sleepingTime: String(editMcu.sleepingTime),
            minSoilMoisture: String(editMcu.minSoilMoisture),
            maxSoilMoisture: String(editMcu.maxSoilMoisture),
            autoControlledIrrigation: editMcu.autoControlledIrrigation,
            isActive: editMcu.isActive,
            fk_irrigationField: editMcu.fk_irrigationField ?? irrigationFieldId,
          }}
        />
      )}

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">
              Supprimer ce MCU ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-[#5A7A65]">
            Cette action supprimera le MCU et tous ses capteurs, actionneurs et
            données associées.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-[#D6E8DC]"
            >
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

      {/* ── Confirm regenerate dialog ── */}
      <Dialog
        open={!!confirmRegenTarget}
        onOpenChange={() => setConfirmRegenTarget(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[#D95F5F]">
              ⚠️ Régénérer la clé API ?
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-[13px] text-[#5A7A65]">
              Cette action va <strong>invalider immédiatement</strong> la clé
              actuelle du MCU. Le dispositif physique ne pourra plus communiquer
              tant que vous ne mettez pas à jour sa configuration avec la
              nouvelle clé.
            </p>
            <div className="p-3 rounded-lg bg-[#FEF3DC] border border-[#E89B2D]">
              <p className="text-[12px] text-[#B8780E] font-medium">
                ⚠️ Assurez-vous d&apos;avoir accès physique au MCU avant de
                continuer.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmRegenTarget(null)}
              className="border-[#D6E8DC]"
            >
              Annuler
            </Button>
            <Button
              onClick={() =>
                confirmRegenTarget &&
                regenerateKey.mutate({ id: confirmRegenTarget })
              }
              disabled={regenerateKey.isPending}
              className="bg-[#D95F5F] hover:bg-[#C04040] text-white gap-2"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  regenerateKey.isPending ? "animate-spin" : ""
                }`}
              />
              {regenerateKey.isPending
                ? "Génération..."
                : "Confirmer et générer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New API key reveal dialog (shown once) ── */}
      <Dialog
        open={!!apiKeyModal}
        onOpenChange={() => {
          setApiKeyModal(null);
          setShowGeneratedKey(false);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Nouvelle clé API — {apiKeyModal?.mcuName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Warning */}
            <div className="p-3 rounded-lg bg-[#FEF3DC] border border-[#E89B2D]">
              <p className="text-[12px] text-[#B8780E] font-medium">
                ⚠️ Copiez cette clé maintenant. Elle ne sera{" "}
                <strong>plus jamais affichée</strong> après fermeture.
              </p>
            </div>

            {/* Key display */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">
                Clé API (raw)
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showGeneratedKey ? "text" : "password"}
                    value={apiKeyModal?.apiKey ?? ""}
                    readOnly
                    className="border-[#D6E8DC] font-mono text-[11px] bg-[#F7F9F5] pr-10"
                  />
                </div>
                <button
                  onClick={() => setShowGeneratedKey((s) => !s)}
                  className="h-9 w-9 rounded-md border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#1A3C2E] transition-colors"
                  title={showGeneratedKey ? "Masquer" : "Afficher"}
                >
                  {showGeneratedKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(apiKeyModal?.apiKey ?? "");
                  }}
                  className="h-9 w-9 rounded-md border border-[#4CAF7D] flex items-center justify-center text-[#4CAF7D] hover:bg-[#E6F7ED] transition-colors"
                  title="Copier"
                >
                  <Key className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Usage hint */}
            <div className="p-3 rounded-lg bg-[#F7F9F5] border border-[#D6E8DC]">
              <p className="text-[11px] text-[#8FAF9A] font-medium uppercase tracking-wider mb-1">
                Utilisation dans le firmware ESP32
              </p>
              <code className="text-[11px] text-[#1A2E22] font-mono break-all">
                const char* API_KEY = &quot;
                {showGeneratedKey ? apiKeyModal?.apiKey : "••••••••••••••••"}
                &quot;;
              </code>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setApiKeyModal(null);
                setShowGeneratedKey(false);
              }}
              className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white"
            >
              J&apos;ai copié la clé — Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
