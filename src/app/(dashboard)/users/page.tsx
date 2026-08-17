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
} from "lucide-react";
import { auth } from "@/lib/auth";
import { useFieldStore } from "@/store/field-store";

let FARM_ID: string;

// ── Role badge ────────────────────────────────────────────────────
const roleColors: Record<string, string> = {
  ADMIN: "bg-[#FDEAEA] text-[#B84040]",
  FARMER: "bg-[#E6F7ED] text-[#2D8653]",
  OPERATOR: "bg-[#EEF2FF] text-[#4F6EF7]",
  VIEWER: "bg-[#F5F5F5] text-[#888]",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
        roleColors[role] ?? "bg-[#F5F5F5] text-[#888]"
      }`}
    >
      {role}
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
              <Label className="text-[12px] text-[#5A7A65]">Nom complet</Label>
              <Input
                placeholder="Bahi Abderrahmane"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Email</Label>
              <Input
                type="email"
                placeholder="abderrahmane@ferme.dz"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-[#5A7A65]">
              {isEdit
                ? "Nouveau mot de passe (laisser vide = inchangé)"
                : "Mot de passe"}
            </Label>
            <Input
              type="password"
              placeholder={isEdit ? "••••••••" : "Min. 8 caractères"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-[#5A7A65]">Adresse</Label>
            <Input
              placeholder="Route nationale, Blida"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D]"
            />
          </div>

          {/* Wilaya */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-[#5A7A65]">Wilaya</Label>
            <select
              value={form.fk_wilaya}
              onChange={(e) => set("fk_wilaya", e.target.value)}
              className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] text-[#1A2E22] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
            >
              <option value="">— Sélectionner —</option>
              {wilayas.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* isActive */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <div>
              <p className="text-[13px] font-medium text-[#1A2E22]">
                Compte actif
              </p>
              <p className="text-[11px] text-[#8FAF9A]">
                Désactiver pour bloquer la connexion
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
            className="border-[#D6E8DC] text-[#5A7A65]"
          >
            Annuler
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={isLoading || !form.name || !form.email}
            className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white"
          >
            {isLoading ? "..." : "Enregistrer"}
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
            Gérer les rôles
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Existing roles */}
          {existingRoles.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-[#8FAF9A] uppercase tracking-wider">
                Rôles actuels
              </p>
              {existingRoles.map((rm) => (
                <div
                  key={rm.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#F7F9F5] border border-[#D6E8DC]"
                >
                  <div className="flex items-center gap-2">
                    <RoleBadge role={rm.fk_role} />
                    {rm.fieldName && (
                      <span className="text-[11px] text-[#8FAF9A]">
                        sur {rm.fieldName}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(rm.id)}
                    className="text-[#8FAF9A] hover:text-[#D95F5F] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new role */}
          <div className="flex flex-col gap-3 p-3 rounded-lg border border-[#D6E8DC] bg-[#F7F9F5]">
            <p className="text-[11px] font-semibold text-[#8FAF9A] uppercase tracking-wider">
              Ajouter un rôle
            </p>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">Rôle</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
              >
                {["ADMIN", "FARMER", "OPERATOR", "VIEWER"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">
                Parcelle (optionnel)
              </Label>
              <select
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                className="h-9 w-full rounded-md border border-[#D6E8DC] bg-white px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#4CAF7D]"
              >
                <option value="">— Toutes les parcelles —</option>
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
              className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white text-[12px] h-8"
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              Assigner
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#D6E8DC]"
          >
            Fermer
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

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#1A2E22]">Utilisateurs</h1>
          <p className="text-[12px] text-[#8FAF9A]">
            {users?.length ?? 0} utilisateur(s) enregistré(s)
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Ajouter utilisateur
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-[#D6E8DC] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#D6E8DC] bg-[#F7F9F5]">
                {[
                  "NOM",
                  "EMAIL",
                  "WILAYA",
                  "RÔLES",
                  "STATUT",
                  "CRÉÉ LE",
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
                  <tr
                    key={i}
                    className="border-b border-[#F0F7F3] animate-pulse"
                  >
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3 bg-[#E8F4ED] rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading &&
                users?.map((user: any) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#F0F7F3] hover:bg-[#F7F9F5] transition-colors"
                  >
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-[#4CAF7D] flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
                          {user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="font-semibold text-[#1A2E22]">
                          {user.name ?? "—"}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3.5 text-[#5A7A65]">{user.email}</td>

                    {/* Wilaya */}
                    <td className="px-4 py-3.5 text-[#5A7A65]">
                      {user.wilaya?.name ?? "—"}
                    </td>

                    {/* Roles */}
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {user.role}
                        {/* {user.roleMembers.length > 0 ? (
                          user.roleMembers.map((rm: any, i: number) => (
                            <RoleBadge key={i} role={rm.fk_role} />
                          ))
                        ) : (
                          <span className="text-[#8FAF9A] text-[11px]">
                            Aucun rôle
                          </span>
                        )} */}
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
                            : "bg-[#F5F5F5] text-[#888] hover:bg-[#E6F7ED] hover:text-[#2D8653]"
                        }`}
                        title={
                          user.isActive
                            ? "Cliquer pour désactiver"
                            : "Cliquer pour activer"
                        }
                      >
                        {user.isActive ? "• Actif" : "• Inactif"}
                      </button>
                    </td>

                    {/* Created at */}
                    <td className="px-4 py-3.5 text-[12px] text-[#8FAF9A]">
                      {new Date(user.createdAt).toLocaleDateString("fr-DZ")}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">

                      {/* ***   to set later for role management *** */}

                        {/* <button
                          onClick={() => setRoleTarget(user.id)}
                          className="h-7 w-7 rounded border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#4CAF7D] hover:border-[#4CAF7D] transition-colors"
                          title="Gérer les rôles"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button> */}
                        <button
                          onClick={() => setEditTarget(user.id)}
                          className="h-7 w-7 rounded border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#4CAF7D] hover:border-[#4CAF7D] transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {/* <button
                          onClick={() => setDeleteTarget(user.id)}
                          className="h-7 w-7 rounded border border-[#D6E8DC] flex items-center justify-center text-[#8FAF9A] hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
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
                    className="px-4 py-8 text-center text-[13px] text-[#8FAF9A]"
                  >
                    Aucun utilisateur. Cliquez sur &quot;Ajouter
                    utilisateur&quot; pour commencer.
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
        title="Ajouter un utilisateur"
        wilayas={wilayas ?? []}
      />

      {/* ── Edit modal ── */}
      {editUser && (
        <UserModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          isLoading={update.isPending}
          title={`Modifier — ${editUser.name}`}
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
            <DialogTitle>Supprimer cet utilisateur ?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-[#5A7A65]">
            Cette action est irréversible. Toutes les données associées seront
            supprimées.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
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
    </div>
  );
}
