"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useFieldStore } from "@/store/field-store"
import { authClient } from "@/lib/auth-client";
import { t, type I18nKey } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Power,
  LogIn,
  ShieldCheck,
  Trash2,
} from "lucide-react";

type FarmForm = {
  name: string;
  address: string;
  description: string;
  fk_wilaya: string;
  isActive: boolean;
  fk_owner: string;
};

const EMPTY_FORM: FarmForm = {
  name: "",
  address: "",
  description: "",
  fk_wilaya: "",
  isActive: true,
  fk_owner: "",
};

export default function FarmsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { setField, setFields, setActiveFarmId } = useFieldStore();
  const { data: session } = authClient.useSession();
  const isSuperAdmin = session?.user?.role === "admin";

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [adminTarget, setAdminTarget] = useState<string | null>(null);

  const { data: farms, isLoading } = trpc.farmingUnit.getAll.useQuery();
  const { data: wilayas } = trpc.farmingUnit.getWilayas.useQuery();
  const { data: users } = trpc.user.getAll.useQuery();

  const invalidate = () => utils.farmingUnit.getAll.invalidate();

  const create = trpc.farmingUnit.create.useMutation({
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
    },
  });

  const update = trpc.farmingUnit.update.useMutation({
    onSuccess: () => {
      invalidate();
      setEditTarget(null);
    },
  });

  const toggleActive = trpc.farmingUnit.toggleActive.useMutation({
    onSuccess: invalidate,
  });

  // ── Enter a farm: scope the topbar selector to this farm's parcelles ──
  async function handleEnter(farmId: string) {
    try {
      const fields = await utils.farmingUnit.getFieldsOfFarm.fetch({ farmId });
      if (!fields || fields.length === 0) {
        alert(t("farms.enter.noFieldsDesc") ?? "This farm has no irrigation fields yet.");
        return;
      }
      const mapped = fields.map((f) => ({
        id: f.id,
        name: f.name ?? null,
        fk_FarmingUnit: f.fk_FarmingUnit ?? null,
      }));
      setActiveFarmId(farmId);
      setFields(mapped);
      setField(mapped[0]);
      router.push("/");
    } catch (err) {
      console.error("handleEnter failed:", err);
      alert(err instanceof Error ? err.message : "Failed to enter farm");
    }
  }

  const editFarm = farms?.find((f) => f.id === editTarget);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">{t("farms.title")}</h1>
          <p className="text-[12px] text-muted-foreground">{t("farms.subtitle")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t("farms.create")}
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-canvas">
                {[
                  "farms.table.name",
                  "farms.table.owner",
                  "farms.table.wilaya",
                  "farms.table.fields",
                  "farms.table.status",
                  "farms.table.actions",
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
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))}

              {farms?.map((farm) => (
                <tr key={farm.id} className="border-b border-border hover:bg-canvas">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{farm.name ?? "—"}</p>
                    {farm.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[260px]">
                        {farm.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {farm.owner?.name ?? farm.owner?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {farm.wilaya?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {farm._count.irrigationFields}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        farm.isActive
                          ? "bg-[#E8F4ED] text-[#2D8653]"
                          : "bg-[#FDEAEA] text-[#D95F5F]"
                      }`}
                    >
                      {farm.isActive
                        ? t("farms.status.active")
                        : t("farms.status.inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <IconAction
                        title={t("farms.actions.enter")}
                        onClick={() => handleEnter(farm.id)}
                      >
                        <LogIn className="h-3.5 w-3.5" />
                      </IconAction>
                      <IconAction
                        title={t("farms.actions.admins")}
                        onClick={() => setAdminTarget(farm.id)}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </IconAction>
                      <IconAction
                        title={t("farms.actions.edit")}
                        onClick={() => setEditTarget(farm.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </IconAction>
                      <IconAction
                        title={
                          farm.isActive
                            ? t("farms.actions.deactivate")
                            : t("farms.actions.activate")
                        }
                        onClick={() =>
                          toggleActive.mutate({ id: farm.id, isActive: !farm.isActive })
                        }
                        danger={farm.isActive}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </IconAction>
                    </div>
                  </td>
                </tr>
              ))}

              {farms?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                    {t("farms.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit dialog ── */}
      <FarmFormDialog
        key={editTarget ?? "create"}
        open={addOpen || !!editTarget}
        initial={editFarm ? {
          name: editFarm.name ?? "",
          address: editFarm.address ?? "",
          description: editFarm.description ?? "",
          fk_wilaya: editFarm.fk_wilaya ?? "",
          isActive: editFarm.isActive,
          fk_owner: editFarm.fk_owner ?? "",
        } : EMPTY_FORM}
        mode={editTarget ? "edit" : "create"}
        wilayas={wilayas ?? []}
        owners={users ?? []}
        isPending={create.isPending || update.isPending}
        onClose={() => {
          setAddOpen(false);
          setEditTarget(null);
        }}
        onSubmit={(form) => {
          if (editTarget) {
            update.mutate({
              id: editTarget,
              name: form.name,
              address: form.address || undefined,
              description: form.description || undefined,
              fk_wilaya: form.fk_wilaya || undefined,
              isActive: form.isActive,
              fk_owner: form.fk_owner || undefined,
            });
          } else {
            create.mutate({
              name: form.name,
              address: form.address || undefined,
              description: form.description || undefined,
              fk_wilaya: form.fk_wilaya || undefined,
              isActive: form.isActive,
              fk_owner: form.fk_owner || undefined,
            });
          }
        }}
      />

      {/* ── Farm admins dialog ── */}
      {adminTarget && (
        <FarmAdminsDialog
          farmId={adminTarget}
          users={users ?? []}
          onClose={() => setAdminTarget(null)}
        />
      )}
    </div>
  );
}

// ── Small icon button ─────────────────────────────────────────────
function IconAction({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-7 w-7 rounded border border-border flex items-center justify-center transition-colors ${
        danger
          ? "text-muted-foreground hover:text-[#D95F5F] hover:border-[#D95F5F]"
          : "text-muted-foreground hover:text-primary hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}

// ── Farm form dialog ──────────────────────────────────────────────
function FarmFormDialog({
  open,
  initial,
  mode,
  wilayas,
  owners,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: FarmForm;
  mode: "create" | "edit";
  wilayas: { id: string; name: string; code: string }[];
  owners: { id: string; name: string | null; email: string }[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (form: FarmForm) => void;
}) {
  const [form, setForm] = useState<FarmForm>(initial);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">
            {mode === "edit" ? t("farms.form.editTitle") : t("farms.form.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{t("farms.form.name")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border-border focus-visible:ring-primary h-10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{t("farms.form.address")}</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="border-border focus-visible:ring-primary h-10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{t("farms.form.description")}</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="rounded-md border border-border bg-card px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("farms.form.wilaya")}</Label>
              <select
                value={form.fk_wilaya}
                onChange={(e) => setForm({ ...form, fk_wilaya: e.target.value })}
                className="h-10 rounded-md border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">{t("farms.form.none")}</option>
                {wilayas.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("farms.form.owner")}</Label>
              <select
                value={form.fk_owner}
                onChange={(e) => setForm({ ...form, fk_owner: e.target.value })}
                className="h-10 rounded-md border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">{t("farms.form.none")}</option>
                {owners.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="h-10">
            {t("farms.form.cancel")}
          </Button>
          <Button
            onClick={() => form.name.trim() && onSubmit(form)}
            disabled={!form.name.trim() || isPending}
            className="h-10"
          >
            {mode === "edit" ? t("farms.form.save") : t("farms.form.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Farm admins dialog ────────────────────────────────────────────
function FarmAdminsDialog({
  farmId,
  users,
  onClose,
}: {
  farmId: string;
  users: { id: string; name: string | null; email: string }[];
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [selectedUser, setSelectedUser] = useState("");

  const { data: admins, isLoading } = trpc.farmingUnit.getFarmAdmins.useQuery({ farmId });

  const invalidate = () => {
    utils.farmingUnit.getFarmAdmins.invalidate({ farmId });
    utils.farmingUnit.getAll.invalidate();
  };

  const setAdmin = trpc.farmingUnit.setFarmAdmin.useMutation({
    onSuccess: () => {
      invalidate();
      setSelectedUser("");
    },
  });

  const removeAdmin = trpc.farmingUnit.removeFarmAdmin.useMutation({
    onSuccess: invalidate,
  });

  const adminUserIds = new Set((admins ?? []).map((a) => a.fk_user));
  const available = users.filter((u) => !adminUserIds.has(u.id));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">
            {t("farms.admins.title")}
          </DialogTitle>
        </DialogHeader>

        {/* Assign a new farm admin */}
        <div className="flex items-center gap-2">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="h-10 flex-1 rounded-md border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">{t("farms.admins.selectUser")}</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email} ({u.email})
              </option>
            ))}
          </select>
          <Button
            onClick={() => setAdmin.mutate({ farmId, userId: selectedUser })}
            disabled={!selectedUser || setAdmin.isPending}
            className="h-10 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {t("farms.admins.assign")}
          </Button>
        </div>

        {/* Current admins */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-canvas">
                <th className="text-left px-3 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  {t("farms.admins.user")}
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  {t("farms.admins.email")}
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                    …
                  </td>
                </tr>
              )}
              {admins?.map((a) => (
                <tr key={a.id} className="border-b border-border">
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {a.user?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{a.user?.email}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => removeAdmin.mutate({ roleMemberId: a.id })}
                      className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {admins?.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                    {t("farms.admins.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="h-10">
            {t("farms.form.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
