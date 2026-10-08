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
import { t, formatRelative, type I18nKey } from "@/i18n";
import { usePermissions } from "@/hooks/use-permissions";

// ── Types ─────────────────────────────────────────────────────────
type MCUStatus = "ONLINE" | "OFFLINE" | "SLEEPING" | "ERROR";

type McuForm = {
  name: string;
  macAddress: string;
  sleepingTime: string;
  autoControlledIrrigation: boolean;
  isActive: boolean;
  fk_irrigationField: string;
};

const emptyForm: McuForm = {
  name: "",
  macAddress: "",
  sleepingTime: "30",
  autoControlledIrrigation: true,
  isActive: true,
  fk_irrigationField: "",
};

// ── MAC address format check ─────────────────────────────────────
const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

function validateMac(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return MAC_REGEX.test(value.trim())
    ? undefined
    : t("errors.format.mac");
}

function normalizeMac(value: string): string {
  return value.trim().toUpperCase().replace(/-/g, ":");
}

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
      <Badge className="text-[11px] px-2 py-0.5 border-0 rounded-full bg-muted text-muted-foreground">
        • {t("data.mcus.status.inactive")}
      </Badge>
    );

  const map: Record<MCUStatus, { bg: string; text: string; labelKey: I18nKey }> = {
    ONLINE: { bg: "bg-[#E6F7ED]", text: "text-[#2D8653]", labelKey: "data.mcus.status.online" },
    OFFLINE: { bg: "bg-muted", text: "text-muted-foreground", labelKey: "data.mcus.status.offline" },
    SLEEPING: { bg: "bg-[#FEF3DC]", text: "text-[#B8780E]", labelKey: "data.mcus.status.sleeping" },
    ERROR: { bg: "bg-[#FDEAEA]", text: "text-[#B84040]", labelKey: "data.mcus.status.error" },
  };

  const s = map[status] ?? map.OFFLINE;
  return (
    <Badge
      className={`text-[11px] px-2 py-0.5 border-0 rounded-full ${s.bg} ${s.text}`}
    >
      • {t(s.labelKey)}
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
      • {auto ? t("data.mcus.mode.auto") : t("data.mcus.mode.manual")}
    </Badge>
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
  const [macError, setMacError] = useState<string | undefined>();
  const [showKey, setShowKey] = useState(false);

  function set<K extends keyof McuForm>(key: K, val: McuForm[K]) {
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
              <Label className="text-[12px] text-muted-foreground">{t("data.mcus.form.name")}</Label>
              <Input
                placeholder={t("data.mcus.form.namePlaceholder")}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="border-border focus-visible:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("data.mcus.form.mac")}</Label>
              <Input
                placeholder={t("data.mcus.form.macPlaceholder")}
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

          {/* ── Irrigation field selector ── */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">
              {t("data.mcus.form.field")}
            </Label>
            <select
              value={form.fk_irrigationField}
              onChange={(e) => set("fk_irrigationField", e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
            <Label className="text-[12px] text-muted-foreground">
              {t("data.mcus.form.mode")}
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
                <span className="text-[13px] text-foreground">{t("data.mcus.form.modeAuto")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={!form.autoControlledIrrigation}
                  onChange={() => set("autoControlledIrrigation", false)}
                  className="accent-[#4CAF7D]"
                />
                <span className="text-[13px] text-foreground">{t("data.mcus.form.modeManual")}</span>
              </label>
            </div>
          </div>

          {/* ── isActive ── */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-canvas">
            <div>
              <p className="text-[13px] font-medium text-foreground">
                {t("data.mcus.form.isActive")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("data.mcus.form.isActiveHint")}
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
                  form.isActive ? "translate-x-4.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* ── Sleeping time ── */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">
              {t("data.mcus.form.updateRate")}
            </Label>
            <Input
              placeholder="30"
              type="number"
              value={form.sleepingTime}
              onChange={(e) => set("sleepingTime", e.target.value)}
              className="border-border focus-visible:ring-primary"
            />
          </div>

          {/* ── API Key section (edit mode only) ── */}
          {initial && (
            <div className="flex flex-col gap-2 p-3 rounded-lg border border-[#D95F5F]/30 bg-[#FDEAEA]/40">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {t("data.mcus.form.apiKey")}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {t("data.mcus.form.apiKeyHint")}
              </p>
              <Button
                variant="outline"
                onClick={onRegenerateKey}
                className="border-[#D95F5F] text-[#D95F5F] hover:bg-[#FDEAEA] gap-2 text-[12px] h-8 w-fit"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("data.mcus.form.apiKeyGenerate")}
              </Button>
            </div>
          )}
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
            onClick={handleSubmit}
            disabled={isLoading || !form.name || !!macError}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isLoading
              ? "..."
              : title.includes("Ajouter")
              ? t("common.add")
              : t("common.saveConfig")}
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
  const { canCreate, canUpdate, canDelete } = usePermissions("mcu");

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
      autoControlledIrrigation: form.autoControlledIrrigation,
      isActive: form.isActive,
      fk_irrigationField: form.fk_irrigationField || irrigationFieldId,
    });
  }

  const editMcu = mcus?.find((m: any) => m.id === editTarget);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("data.mcus.title")}
        </p>
        {canCreate && (
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white text-[12px] h-8 px-3 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />{t("data.mcus.add")}
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-canvas">
              {[
                "data.mcus.columns.name",
                "data.mcus.columns.mac",
                "data.mcus.columns.mode",
                "data.mcus.columns.sleep",
                "data.mcus.columns.status",
                "data.mcus.columns.lastSeen",
                "data.mcus.columns.actions",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground"
                >
                  {t(h as I18nKey)}
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
                      <div className="h-3 bg-green-soft rounded w-16" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading &&
              mcus?.map((mcu: any) => (
                <tr
                  key={mcu.id}
                  className="border-b border-[#F0F7F3] hover:bg-canvas transition-colors"
                >
                  {/* Name */}
                  <td className="px-4 py-3.5 font-semibold text-foreground">
                    {mcu.name ?? "—"}
                  </td>

                  {/* MAC */}
                  <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                    {mcu.macAddress ?? "—"}
                  </td>

                  {/* Mode */}
                  <td className="px-4 py-3.5">
                    <ModeBadge auto={mcu.autoControlledIrrigation} />
                  </td>

                  {/* Sleeping time */}
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {t("data.mcus.sleep", { n: mcu.sleepingTime })}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusBadge
                      status={mcu.status as MCUStatus}
                      isActive={mcu.isActive}
                    />
                  </td>

                  {/* Last seen */}
                  <td className="px-4 py-3.5 text-[12px] text-muted-foreground">
                    {formatRelative(mcu.lastSeenAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {canUpdate && (
                        <button
                          onClick={() => setEditTarget(mcu.id)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                          title={t("common.configure")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(mcu.id)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
                          title={t("common.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

            {!isLoading && mcus?.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-[13px] text-muted-foreground"
                >
                  {t("data.mcus.empty")}
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
        title={t("data.mcus.form.titleAdd")}
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
          title={t("data.mcus.form.titleEdit", { name: editMcu.name })}
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
              {t("data.mcus.delete.title")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            {t("data.mcus.delete.message")}
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
              onClick={() =>
                deleteTarget && remove.mutate({ id: deleteTarget })
              }
              disabled={remove.isPending}
              className="bg-[#D95F5F] hover:bg-[#C04040] text-white"
            >
              {remove.isPending ? "..." : t("common.delete")}
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
              {t("data.mcus.apiKey.regenTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-[13px] text-muted-foreground">
              {t("data.mcus.apiKey.regenMessage")}
            </p>
            <div className="p-3 rounded-lg bg-[#FEF3DC] border border-[#E89B2D]">
              <p className="text-[12px] text-[#B8780E] font-medium">
                {t("data.mcus.apiKey.regenAlert")}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmRegenTarget(null)}
              className="border-border"
            >
              {t("common.cancel")}
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
                ? t("data.mcus.apiKey.generating")
                : t("data.mcus.apiKey.regenConfirm")}
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
              {t("data.mcus.apiKey.revealTitle", { name: apiKeyModal?.mcuName })}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Warning */}
            <div className="p-3 rounded-lg bg-[#FEF3DC] border border-[#E89B2D]">
              <p className="text-[12px] text-[#B8780E] font-medium">
                {t("data.mcus.apiKey.revealWarning")}
              </p>
            </div>

            {/* Key display */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">
                {t("data.mcus.apiKey.rawLabel")}
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showGeneratedKey ? "text" : "password"}
                    value={apiKeyModal?.apiKey ?? ""}
                    readOnly
                    className="border-border font-mono text-[11px] bg-canvas pr-10"
                  />
                </div>
                <button
                  onClick={() => setShowGeneratedKey((s) => !s)}
                  className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title={showGeneratedKey ? t("common.hide") : t("common.display")}
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
                  className="h-9 w-9 rounded-md border border-primary flex items-center justify-center text-primary hover:bg-[#E6F7ED] transition-colors"
                  title={t("common.copy")}
                >
                  <Key className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Usage hint */}
            <div className="p-3 rounded-lg bg-canvas border border-border">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                {t("data.mcus.apiKey.sketchHint")}
              </p>
              <code className="text-[11px] text-foreground font-mono break-all">
                {t("data.mcus.apiKey.sketchLine", {
                  key: showGeneratedKey ? apiKeyModal?.apiKey : t("data.mcus.apiKey.maskedKey"),
                })}
              </code>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setApiKeyModal(null);
                setShowGeneratedKey(false);
              }}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {t("data.mcus.apiKey.doneClose")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
