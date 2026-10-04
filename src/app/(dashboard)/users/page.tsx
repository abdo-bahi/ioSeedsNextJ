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
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  UserX,
  UserCheck,
  History,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { useFieldStore } from "@/store/field-store";
import { t, type I18nKey } from "@/i18n";

let FARM_ID: string;

// ── Role badge ────────────────────────────────────────────────────
const roleColors: Record<string, string> = {
  ADMIN: "bg-[#FDEAEA] text-[#B84040]",
  FARMER: "bg-[#E6F7ED] text-[#2D8653]",
  OPERATOR: "bg-[#EEF2FF] text-[#4F6EF7]",
  VIEWER: "bg-muted text-muted-foreground",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
        roleColors[role] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {t(`users.roles.${role}` as I18nKey)}
    </span>
  );
}

// ── User form type ────────────────────────────────────────────────
type UserForm = {
  name: string;
  email: string;
  password: string;
  address: string;
  isActive: boolean;
  fk_wilaya: string;
  fk_farm: string;
};

let emptyForm: UserForm;

// ── User Modal ────────────────────────────────────────────────────
function UserModal({
  open,
  onClose,
  onSubmit,
  initial,
  isLoading,
  title,
  wilayas,
  isEdit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: UserForm) => void;
  initial?: UserForm;
  isLoading: boolean;
  title: string;
  wilayas: { id: string; name: string; code: string }[];
  isEdit?: boolean;
}) {
  const [form, setForm] = useState<UserForm>(initial ?? emptyForm);

  function set<K extends keyof UserForm>(key: K, val: UserForm[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("users.form.name")}</Label>
              <Input
                placeholder={t("users.form.namePlaceholder")}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="border-border focus-visible:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("users.form.email")}</Label>
              <Input
                type="email"
                placeholder={t("users.form.emailPlaceholder")}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="border-border focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">
              {isEdit
                ? t("users.form.password") : t("users.form.passwordCreate")}
            </Label>
            <Input
              type="password"
              placeholder={isEdit ? "••••••••" : t("users.form.passwordHint")}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="border-border focus-visible:ring-primary"
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{t("users.form.address")}</Label>
            <Input
              placeholder={t("users.form.addressPlaceholder")}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="border-border focus-visible:ring-primary"
            />
          </div>

          {/* Wilaya */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{t("users.form.wilaya")}</Label>
            <select
              value={form.fk_wilaya}
              onChange={(e) => set("fk_wilaya", e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("common.select")}</option>
              {wilayas.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* isActive */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-canvas">
            <div>
              <p className="text-[13px] font-medium text-foreground">
                {t("users.form.isActive")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("users.form.isActiveHint")}
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
                  form.isActive ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
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
            disabled={isLoading || !form.name || !form.email}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isLoading ? "..." : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Role assignment modal ─────────────────────────────────────────
function RoleModal({
  open,
  onClose,
  userId,
  fields,
  onAssign,
  onRemove,
  existingRoles,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  fields: { id: string; name: string | null }[];
  onAssign: (role: string, fieldId?: string) => void;
  onRemove: (roleMemberId: string) => void;
  existingRoles: { id: string; fk_role: string; fieldName?: string | null }[];
  isLoading: boolean;
}) {
  const [role, setRole] = useState("VIEWER");
  const [fieldId, setFieldId] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">
            {t("users.rolesModal.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Existing roles */}
          {existingRoles.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("users.rolesModal.current")}
              </p>
              {existingRoles.map((rm) => (
                <div
                  key={rm.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-border"
                >
                  <div className="flex items-center gap-2">
                    <RoleBadge role={rm.fk_role} />
                    {rm.fieldName && (
                      <span className="text-[11px] text-muted-foreground">
                        {t("users.rolesModal.onField", { field: rm.fieldName })}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(rm.id)}
                    className="text-muted-foreground hover:text-[#D95F5F] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new role */}
          <div className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-canvas">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("users.rolesModal.add")}
            </p>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">{t("users.rolesModal.role")}</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {["ADMIN", "FARMER", "OPERATOR", "VIEWER"].map((r) => (
                  <option key={r} value={r}>
                    {t(`users.roles.${r}` as I18nKey)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">
                {t("users.rolesModal.field")}
              </Label>
              <select
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">{t("common.allFields")}</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={() => onAssign(role, fieldId || undefined)}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-white text-[12px] h-8"
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              {t("users.rolesModal.assign")}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border"
          >
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function ConnectionLogsDialog({
  open,
  onClose,
  userId,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}) {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const pageSize = 8;

  const { data, isLoading } = trpc.user.getConnectionLogs.useQuery(
    {
      userId,
      page,
      pageSize,
      from: from || undefined,
      to: to || undefined,
    },
    {
      enabled: open,
      placeholderData: (prev) => prev,
    }
  );

  const logs = data?.logs;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function applyRange(nextFrom: string, nextTo: string, resetPage: boolean) {
    setFrom(nextFrom);
    setTo(nextTo);
    if (resetPage) setPage(1);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">
            {t("users.connections.title", { name: userName })}
          </DialogTitle>
        </DialogHeader>

        {/* Date filter */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{t("common.from")}</Label>
            <Input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => applyRange(e.target.value, to, true)}
              className="border-border focus-visible:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{t("common.to")}</Label>
            <Input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => applyRange(from, e.target.value, true)}
              className="border-border focus-visible:ring-primary"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isLoading && !logs && (
            <p className="text-[13px] text-muted-foreground py-6 text-center">
              {t("common.loading")}
            </p>
          )}

          {!isLoading && (!logs || logs.length === 0) && (
            <p className="text-[13px] text-muted-foreground py-6 text-center">
              {t("users.connections.empty")}
            </p>
          )}

          {logs?.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-canvas border border-border"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    log.success ? "bg-[#2D8653]" : "bg-[#D95F5F]"
                  }`}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-medium text-foreground">
                    {new Date(log.dateTime).toLocaleString("fr-DZ")}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono truncate">
                    {log.ipAddress}
                    {log.location ? ` · ${log.location}` : ""}
                  </span>
                </div>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                  log.success
                    ? "bg-[#E6F7ED] text-[#2D8653]"
                    : "bg-[#FDEAEA] text-[#B84040]"
                }`}
              >
                {log.success ? t("users.connections.success") : t("users.connections.failure")}
              </span>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">
            {t("users.connections.count", { n: total })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("common.prev")}
            </Button>
            <span className="text-[12px] text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-border"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-border">
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function UsersPage() {
  const utils = trpc.useUtils();
  const { selectedField } = useFieldStore();

  FARM_ID = selectedField?.fk_FarmingUnit ?? "Unnamed farm";

  emptyForm = {
    name: "",
    email: "",
    password: "",
    address: "",
    isActive: true,
    fk_wilaya: "",
    fk_farm: FARM_ID,
  };
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [roleTarget, setRoleTarget] = useState<string | null>(null);
  const [logsTarget, setLogsTarget] = useState<string | null>(null);

  // ── Queries ───────────────────────────────────────────────────
  const { data: users, isLoading } = trpc.user.getAll.useQuery();
  const { data: wilayas } = trpc.farmingUnit.getWilayas.useQuery();
  const { data: fields } = trpc.irrigationField.getAllByFarm.useQuery({
    farmId: FARM_ID,
  });

  const fieldOptions = fields?.map((f) => ({ id: f.id, name: f.name })) ?? [];

  // ── Mutations ─────────────────────────────────────────────────
  const invalidate = () => utils.user.getAll.invalidate();

  const create = trpc.user.create.useMutation({
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
    },
  });

  const update = trpc.user.update.useMutation({
    onSuccess: () => {
      invalidate();
      setEditTarget(null);
    },
  });

  const toggleActive = trpc.user.toggleActive.useMutation({
    onSuccess: invalidate,
  });

  const remove = trpc.user.delete.useMutation({
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  const assignRole = trpc.user.assignRole.useMutation({
    onSuccess: invalidate,
  });

  const removeRole = trpc.user.removeRole.useMutation({
    onSuccess: invalidate,
  });

  // ── Helpers ───────────────────────────────────────────────────
  function handleCreate(form: UserForm) {
    create.mutate({
      name: form.name,
      email: form.email,
      password: form.password,
      address: form.address || undefined,
      isActive: form.isActive,
      fk_wilaya: form.fk_wilaya || undefined,
      fk_farm: FARM_ID,
    });
  }

  function handleUpdate(form: UserForm) {
    if (!editTarget) return;
    update.mutate({
      id: editTarget,
      name: form.name,
      email: form.email,
      address: form.address || undefined,
      isActive: form.isActive,
      fk_wilaya: form.fk_wilaya || undefined,
      password: form.password || undefined,
    });
  }

  const editUser = users?.find((u: any) => u.id === editTarget);
  const roleUser = users?.find((u: any) => u.id === roleTarget);
  const logsUser = users?.find((u: any) => u.id === logsTarget);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">{t("users.title")}</h1>
          <p className="text-[12px] text-muted-foreground">
            {t("users.count", { n: users?.length ?? 0 })}
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {t("users.add")}
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-canvas">
                {[
                  "users.columns.name",
                  "users.columns.email",
                  "users.columns.wilaya",
                  "users.columns.roles",
                  "users.columns.status",
                  "users.columns.createdAt",
                  "users.columns.actions",
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
                  <tr
                    key={i}
                    className="border-b border-[#F0F7F3] animate-pulse"
                  >
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3 bg-green-soft rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading &&
                users?.map((user: any) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#F0F7F3] hover:bg-canvas transition-colors"
                  >
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
                          {user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="font-semibold text-foreground">
                          {user.name ?? "—"}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3.5 text-muted-foreground">{user.email}</td>

                    {/* Wilaya */}
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {user.wilaya?.name ?? "—"}
                    </td>

                    {/* Roles */}
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {user.role ? (
                          <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                            {t(`users.roles.${user.role}` as I18nKey)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">
                            {t("users.noRole")}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() =>
                          toggleActive.mutate({
                            id: user.id,
                            isActive: !user.isActive,
                          })
                        }
                        className={`text-[11px] px-2 py-0.5 rounded-full border-0 font-medium transition-colors ${
                          user.isActive
                            ? "bg-[#E6F7ED] text-[#2D8653] hover:bg-[#FDEAEA] hover:text-[#B84040]"
                            : "bg-muted text-muted-foreground hover:bg-[#E6F7ED] hover:text-[#2D8653]"
                        }`}
                        title={
                          user.isActive
                            ? t("users.clickToDeactivate")
                            : t("users.clickToActivate")
                        }
                      >
                        {user.isActive ? `• ${t("common.active")}` : `• ${t("common.inactive")}`}
                      </button>
                    </td>

                    {/* Created at */}
                    <td className="px-4 py-3.5 text-[12px] text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("fr-DZ")}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">

                      {/* ***   to set later for role management *** */}

                        {/* <button
                          onClick={() => setRoleTarget(user.id)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                          title="Gérer les rôles"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button> */}
                        <button
                          onClick={() => setEditTarget(user.id)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                          title={t("common.edit")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setLogsTarget(user.id)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                          title={t("users.logs")}
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        {/* <button
                          onClick={() => setDeleteTarget(user.id)}
                          className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && users?.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-[13px] text-muted-foreground"
                  >
                    {t("users.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add modal ── */}
      <UserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        isLoading={create.isPending}
        title={t("users.form.titleAdd")}
        wilayas={wilayas ?? []}
      />

      {/* ── Edit modal ── */}
      {editUser && (
        <UserModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          isLoading={update.isPending}
          title={t("users.form.titleEdit", { name: editUser.name })}
          wilayas={wilayas ?? []}
          isEdit
          initial={{
            name: editUser.name ?? "",
            email: editUser.email,
            password: "",
            address: editUser.address ?? "",
            isActive: editUser.isActive,
            fk_wilaya: editUser.fk_wilaya ?? "",
            fk_farm: FARM_ID,
          }}
        />
      )}

      {/* ── Connection logs modal ── */}
      {logsUser && (
        <ConnectionLogsDialog
          open={!!logsTarget}
          onClose={() => setLogsTarget(null)}
          userId={logsUser.id}
          userName={logsUser.name ?? logsUser.email}
        />
      )}

      {/* ── Role modal ── */}
      {roleUser && (
        <RoleModal
          open={!!roleTarget}
          onClose={() => setRoleTarget(null)}
          userId={roleUser.id}
          fields={fieldOptions}
          isLoading={assignRole.isPending || removeRole.isPending}
          existingRoles={roleUser.roleMembers.map((rm: any) => ({
            id: rm.id ?? "",
            fk_role: rm.fk_role,
            fieldName: rm.irrigationField?.name,
          }))}
          onAssign={(role, fieldId) =>
            assignRole.mutate({
              fk_user: roleUser.id,
              fk_role: role,
              fk_irrigationField: fieldId,
            })
          }
          onRemove={(roleMemberId) => removeRole.mutate({ roleMemberId })}
        />
      )}

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{t("users.delete.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            {t("users.delete.message")}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
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
    </div>
  );
}
