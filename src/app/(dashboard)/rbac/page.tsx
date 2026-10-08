"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useFieldStore } from "@/store/field-store";
import { t, type I18nKey } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Power } from "lucide-react";

// Must stay in sync with the seeded functionality names (prisma/seed.ts).
const FUNCTIONALITY_NAMES = [
  "irrigationField",
  "farmingUnit",
  "mcu",
  "sensor",
  "actuator",
  "thresholds",
  "schedules",
  "users",
  "auditLog",
];

const PERM_COLUMNS = [
  { key: "canRead",   labelKey: "rbac.matrix.read" },
  { key: "canCreate", labelKey: "rbac.matrix.create" },
  { key: "canUpdate", labelKey: "rbac.matrix.update" },
  { key: "canDelete", labelKey: "rbac.matrix.delete" },
  { key: "canToggle", labelKey: "rbac.matrix.toggle" },
] as const;

type PermKey = (typeof PERM_COLUMNS)[number]["key"];

const DEFAULTS: Record<PermKey, boolean> = {
  canRead:   true,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canToggle: false,
};

function funcLabel(name: string) {
  return t(`rbac.func.${name}` as I18nKey);
}

export default function RbacPage() {
  const [activeTab, setActiveTab] = useState<"roles" | "members">("roles");

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[18px] font-bold text-foreground">
          {t("rbac.title")}
        </h1>
        <p className="text-[12px] text-muted-foreground">
          {t("rbac.subtitle")}
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-border">
        {[
          { key: "roles",   labelKey: "rbac.tab.roles" },
          { key: "members", labelKey: "rbac.tab.members" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "roles" | "members")}
            className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(tab.labelKey as I18nKey)}
          </button>
        ))}
      </div>

      {activeTab === "roles" ? <RolesTab /> : <MembersTab />}
    </div>
  );
}

// ── Tab 1: Roles & Functionalities ────────────────────────────────
function RolesTab() {
  const utils = trpc.useUtils();
  const [selectedRole, setSelectedRole] = useState("");
  const [innerTab, setInnerTab] = useState<"roles" | "functionalities">("roles");
  const [newRoleName, setNewRoleName] = useState("");

  const { data: roles } = trpc.rbac.getRoles.useQuery();
  const { data: functionalities } = trpc.rbac.getFunctionalities.useQuery();

  const createRole = trpc.rbac.createRole.useMutation({
    onSuccess: () => {
      utils.rbac.getRoles.invalidate();
      setNewRoleName("");
    },
  });

  const toggleRole = trpc.rbac.toggleRole.useMutation({
    onSuccess: () => utils.rbac.getRoles.invalidate(),
  });

  return (
    <div className="space-y-4">
      {/* ── Create role ── */}
      <div className="flex items-center gap-2">
        <input
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          placeholder={t("rbac.roles.createPlaceholder")}
          className="h-9 rounded-md border border-border bg-card px-3 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          onClick={() => newRoleName.trim() && createRole.mutate({ name: newRoleName.trim() })}
          disabled={!newRoleName.trim() || createRole.isPending}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {t("rbac.roles.create")}
        </Button>
      </div>

      {/* ── Role selector ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-[13px] font-medium text-foreground">{t("rbac.roles.select")}</p>
        {roles?.map((r) => (
          <button
            key={r.name}
            onClick={() => setSelectedRole(r.name)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
              selectedRole === r.name
                ? "bg-primary text-white border-primary"
                : "bg-card text-foreground border-border hover:border-primary"
            } ${r.isActive ? "" : "opacity-50"}`}
          >
            {r.name}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                toggleRole.mutate({ name: r.name, isActive: !r.isActive });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  toggleRole.mutate({ name: r.name, isActive: !r.isActive });
                }
              }}
              className="text-muted-foreground hover:text-foreground"
              title={r.isActive ? t("rbac.roles.deactivate") : t("rbac.roles.activate")}
            >
              <Power className="h-3 w-3" />
            </span>
          </button>
        ))}
        {roles?.length === 0 && (
          <span className="text-[12px] text-muted-foreground">{t("rbac.roles.empty")}</span>
        )}
      </div>

      {/* ── Inner tabs ── */}
      <div className="flex gap-0 border-b border-border">
        {[
          { key: "roles", labelKey: "rbac.matrix.title" },
          { key: "functionalities", labelKey: "rbac.functionalities.title" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setInnerTab(tab.key as "roles" | "functionalities")}
            className={`px-4 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
              innerTab === tab.key
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(tab.labelKey as I18nKey)}
          </button>
        ))}
      </div>

      {innerTab === "roles" ? (
        <PermissionsMatrix roleName={selectedRole} />
      ) : (
        <FunctionalitiesList functionalities={functionalities} />
      )}
    </div>
  );
}

// ── Permissions matrix ────────────────────────────────────────────
function PermissionsMatrix({ roleName }: { roleName: string }) {
  const utils = trpc.useUtils();

  const { data: roleFuncs } = trpc.rbac.getRoleFunctionalities.useQuery(
    { roleName },
    { enabled: !!roleName }
  );

  const upsert = trpc.rbac.upsertRoleFunctionality.useMutation({
    onSuccess: () => utils.rbac.getRoleFunctionalities.invalidate(),
  });

  const funcMap: Record<string, Partial<Record<PermKey, boolean>>> = {};
  for (const rf of roleFuncs ?? []) {
    funcMap[rf.fk_functionality] = {
      canRead:   rf.canRead,
      canCreate: rf.canCreate,
      canUpdate: rf.canUpdate,
      canDelete: rf.canDelete,
      canToggle: rf.canToggle,
    };
  }

  function handlePermChange(func: string, perm: PermKey, value: boolean) {
    const current = funcMap[func] ?? {};
    upsert.mutate({
      fk_role:          roleName,
      fk_functionality: func,
      canRead:   current.canRead   ?? DEFAULTS.canRead,
      canCreate: current.canCreate ?? DEFAULTS.canCreate,
      canUpdate: current.canUpdate ?? DEFAULTS.canUpdate,
      canDelete: current.canDelete ?? DEFAULTS.canDelete,
      canToggle: current.canToggle ?? DEFAULTS.canToggle,
      [perm]:    value,
    });
  }

  if (!roleName) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-[13px] text-muted-foreground">
        {t("rbac.noRoleSelected")}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-canvas">
              <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider text-muted-foreground">
                {t("rbac.matrix.functionality")}
              </th>
              {PERM_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="text-center px-3 py-3 text-[10px] font-semibold tracking-wider text-muted-foreground"
                >
                  {t(col.labelKey as I18nKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FUNCTIONALITY_NAMES.map((func) => {
              const rf = funcMap[func] ?? {};
              return (
                <tr key={func} className="border-b border-border hover:bg-canvas">
                  <td className="px-5 py-3 font-medium text-foreground capitalize">
                    {funcLabel(func)}
                  </td>
                  {PERM_COLUMNS.map((col) => (
                    <td key={col.key} className="text-center px-3 py-3">
                      <input
                        type="checkbox"
                        checked={rf[col.key] ?? DEFAULTS[col.key]}
                        onChange={(e) => handlePermChange(func, col.key, e.target.checked)}
                        disabled={upsert.isPending}
                        className="h-4 w-4 accent-primary cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Read-only functionalities list ────────────────────────────────
function FunctionalitiesList({
  functionalities,
}: {
  functionalities: { name: string }[] | undefined;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-canvas">
            <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider text-muted-foreground">
              {t("rbac.functionalities.item")}
            </th>
          </tr>
        </thead>
        <tbody>
          {(functionalities ?? []).map((f) => (
            <tr key={f.name} className="border-b border-border hover:bg-canvas">
              <td className="px-5 py-3 font-medium text-foreground capitalize">
                {funcLabel(f.name)}
                <span className="ml-2 text-[11px] font-mono text-muted-foreground">
                  {f.name}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab 2: Members per field ──────────────────────────────────────
function MembersTab() {
  const { selectedField } = useFieldStore();
  const utils = trpc.useUtils();

  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const members = trpc.rbac.getMembersByField.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    { enabled: !!selectedField?.id }
  );
  const roles = trpc.rbac.getRoles.useQuery();
  const users = trpc.user.getAll.useQuery();

  const assign = trpc.rbac.assignRole.useMutation({
    onSuccess: () => {
      utils.rbac.getMembersByField.invalidate();
      utils.user.getAll.invalidate();
      setSelectedUser("");
      setSelectedRole("");
    },
  });

  const remove = trpc.rbac.removeRole.useMutation({
    onSuccess: () => {
      utils.rbac.getMembersByField.invalidate();
      utils.user.getAll.invalidate();
    },
  });

  if (!selectedField) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-[13px] text-muted-foreground">
        {t("rbac.members.noField")}
      </div>
    );
  }

  const activeRoles = (roles.data ?? []).filter((r) => r.isActive);

  return (
    <div className="space-y-4">
      {/* Assign form */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-[13px] font-semibold text-foreground mb-3">
          {t("rbac.members.assignTitle", { name: selectedField.name ?? "" })}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="h-9 rounded-md border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">{t("rbac.members.selectUser")}</option>
            {(users.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email} ({u.email})
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="h-9 rounded-md border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">{t("rbac.members.selectRole")}</option>
            {activeRoles.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>

          <Button
            onClick={() =>
              assign.mutate({
                fk_user:            selectedUser,
                fk_role:            selectedRole,
                fk_irrigationField: selectedField.id,
              })
            }
            disabled={!selectedUser || !selectedRole || assign.isPending}
            className="h-9 text-[13px]"
          >
            {t("rbac.members.assign")}
          </Button>
        </div>
      </div>

      {/* Members table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-canvas">
                {["rbac.members.user", "rbac.members.email", "rbac.members.role", "rbac.members.actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground"
                    >
                      {t(h as I18nKey)}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {members.data?.map((m) => (
                <tr key={m.id} className="border-b border-border hover:bg-canvas">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {m.user?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.user?.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        m.role.isActive
                          ? "bg-[#E8F4ED] text-[#2D8653]"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.fk_role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => remove.mutate({ roleMemberId: m.id })}
                      className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-[#D95F5F] hover:border-[#D95F5F] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {members.data?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                    {t("rbac.members.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}