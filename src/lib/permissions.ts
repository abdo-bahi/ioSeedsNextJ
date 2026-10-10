import { prisma } from "../../prisma/lib/prisma"
import type { Prisma } from "../../generated/prisma/client"
import { TRPCError } from "@trpc/server"

/**
 * Canonical system functionality names — used by the Role_Functionality
 * matrix, the RBAC management UI and every permission check.
 */
export const FUNCTIONALITY_NAMES = [
  "irrigationField",
  "farmingUnit",
  "mcu",
  "sensor",
  "actuator",
  "thresholds",
  "schedules",
  "users",
  "auditLog",
] as const

export type FunctionalityName = (typeof FUNCTIONALITY_NAMES)[number]

export type Permission = "canRead" | "canCreate" | "canUpdate" | "canDelete" | "canToggle"

export type PermissionSet = Record<Permission, boolean>

export const ALLOWED: PermissionSet = {
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  canToggle: true,
}

const FORBIDDEN: PermissionSet = {
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canToggle: false,
}

/**
 * Super-admin (Better Auth `user.role === "admin"`): global access everywhere.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return !!user && user.role === "admin"
}

/**
 * Farm IDs where the user holds an ADMIN role (field-level ADMIN memberships
 * resolve to their farm). Returns `"ALL"` for a super-admin or a global
 * (`null`/`null`) ADMIN member — i.e. admin of every farm.
 */
export async function getAdminFarmIds(userId: string): Promise<Set<string> | "ALL"> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user) return new Set()
  if (user.role === "admin") return "ALL"

  const members = await prisma.roleMember.findMany({
    where: { fk_user: userId, fk_role: "ADMIN" },
    select: { fk_irrigationField: true, fk_farmingUnit: true },
  })

  const farmIds = new Set<string>()
  let global = false
  const fieldIds: string[] = []

  for (const m of members) {
    if (m.fk_irrigationField === null && m.fk_farmingUnit === null) {
      global = true
    } else if (m.fk_farmingUnit) {
      farmIds.add(m.fk_farmingUnit)
    } else if (m.fk_irrigationField) {
      fieldIds.push(m.fk_irrigationField)
    }
  }

  if (global) return "ALL"

  if (fieldIds.length > 0) {
    const fields = await prisma.irrigationField.findMany({
      where: { id: { in: fieldIds } },
      select: { fk_FarmingUnit: true },
    })
    for (const f of fields) farmIds.add(f.fk_FarmingUnit)
  }

  return farmIds
}

/**
 * Is the user an admin of this specific farm (or a super-admin)?
 */
export async function isAdminOfFarm(userId: string, farmingUnitId: string): Promise<boolean> {
  if (!farmingUnitId) return false
  const farms = await getAdminFarmIds(userId)
  if (farms === "ALL") return true
  return farms.has(farmingUnitId)
}

/**
 * Loose "is an admin somewhere" marker — super-admin or any ADMIN membership.
 * Used for nav visibility, audit access and the RBAC matrix edit guard.
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  const farms = await getAdminFarmIds(userId)
  if (farms === "ALL") return true
  return farms.size > 0
}

/**
 * Core check — the user's permissions for `functionality` on a single field.
 * A farm admin (ADMIN on the field, on the farm, or global) gets all access on
 * every field of that farm. Regular roles resolve through per-field,
 * per-farm and global (`null`/`null`) memberships.
 */
export async function can(
  userId: string,
  functionality: string,
  irrigationFieldId: string,
  permission: Permission
): Promise<boolean> {
  return (await getPermissions(userId, functionality, irrigationFieldId))[permission]
}

/**
 * Farm-scoped evaluation — the user may act on the farm if they hold the
 * permission through any field of the farm, a farm-level membership, a global
 * membership, or the farm-admin bypass.
 */
export async function canOnFarm(
  userId: string,
  functionality: string,
  farmId: string,
  permission: Permission
): Promise<boolean> {
  return (await getPermissionsOnFarm(userId, functionality, farmId))[permission]
}

/**
 * All permissions for `functionality` on `irrigationFieldId` in one pass.
 * Empty `irrigationFieldId` evaluates farm/global memberships only.
 */
export async function getPermissions(
  userId: string,
  functionality: string,
  irrigationFieldId: string
): Promise<PermissionSet> {
  if (!userId) return FORBIDDEN

  if (await isSuperAdmin(userId)) return ALLOWED

  const farmId = irrigationFieldId
    ? (await prisma.irrigationField.findUnique({
        where: { id: irrigationFieldId },
        select: { fk_FarmingUnit: true },
      }))?.fk_FarmingUnit
    : undefined

  if (farmId && (await isAdminOfFarm(userId, farmId))) return ALLOWED

  const scope: Prisma.RoleMemberWhereInput[] = [{ fk_irrigationField: null, fk_farmingUnit: null }]
  if (irrigationFieldId) scope.push({ fk_irrigationField: irrigationFieldId })
  if (farmId) scope.push({ fk_farmingUnit: farmId })

  return resolvePermissions(userId, functionality, scope)
}

/**
 * Farm-scoped variant of {@link getPermissions}. Members holding the
 * permission through any field of the farm (or a farm/global membership)
 * satisfy the check; the farm-admin bypass grants everything.
 */
export async function getPermissionsOnFarm(
  userId: string,
  functionality: string,
  farmId: string
): Promise<PermissionSet> {
  if (!userId) return FORBIDDEN

  if (await isSuperAdmin(userId)) return ALLOWED
  if (await isAdminOfFarm(userId, farmId)) return ALLOWED

  const fieldIds = await prisma.irrigationField.findMany({
    where: { fk_FarmingUnit: farmId },
    select: { id: true },
  })

  const scope: Prisma.RoleMemberWhereInput[] = [{ fk_irrigationField: null, fk_farmingUnit: null }]
  if (fieldIds.length > 0) scope.push({ fk_irrigationField: { in: fieldIds.map((f) => f.id) } })
  scope.push({ fk_farmingUnit: farmId })

  return resolvePermissions(userId, functionality, scope)
}

/**
 * Shared matrix resolution — ORs the granted flags across all matched scopes.
 */
async function resolvePermissions(
  userId: string,
  functionality: string,
  scope: Prisma.RoleMemberWhereInput[]
): Promise<PermissionSet> {
  const members = await prisma.roleMember.findMany({
    where: { fk_user: userId, OR: scope },
    select: { fk_role: true },
  })

  const roleNames = members.map((m) => m.fk_role)
  if (roleNames.includes("ADMIN")) return ALLOWED
  if (roleNames.length === 0) return FORBIDDEN

  const ok = await prisma.role_Functionality.findMany({
    where: {
      fk_role: { in: roleNames },
      fk_functionality: functionality,
      role: { isActive: true },
    },
    select: {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canToggle: true,
    },
  })

  return {
    canRead: ok.some((r) => r.canRead),
    canCreate: ok.some((r) => r.canCreate),
    canUpdate: ok.some((r) => r.canUpdate),
    canDelete: ok.some((r) => r.canDelete),
    canToggle: ok.some((r) => r.canToggle),
  }
}

/**
 * Fields the user may select in the UI: all fields for a super-admin or a
 * global member; otherwise the fields they hold a role on (directly or via a
 * farm-level membership).
 */
export async function getAccessibleFields(userId: string) {
  if (!userId) return []

  if (await isSuperAdmin(userId)) {
    return prisma.irrigationField.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, fk_FarmingUnit: true },
    })
  }

  const members = await prisma.roleMember.findMany({
    where: { fk_user: userId },
    select: { fk_irrigationField: true, fk_farmingUnit: true },
  })

  if (members.some((m) => m.fk_irrigationField === null && m.fk_farmingUnit === null)) {
    return prisma.irrigationField.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, fk_FarmingUnit: true },
    })
  }

  const fieldIds = members
    .map((m) => m.fk_irrigationField)
    .filter((f): f is string => !!f)
  const farmIds = members
    .map((m) => m.fk_farmingUnit)
    .filter((f): f is string => !!f)

  const where: Prisma.IrrigationFieldWhereInput[] = []
  if (fieldIds.length > 0) where.push({ id: { in: fieldIds } })
  if (farmIds.length > 0) where.push({ fk_FarmingUnit: { in: farmIds } })

  if (where.length === 0) return []

  return prisma.irrigationField.findMany({
    where: { OR: where },
    orderBy: { name: "asc" },
    select: { id: true, name: true, fk_FarmingUnit: true },
  })
}

/** Throw FORBIDDEN unless the permission is granted for the field. Empty
 *  field scope requires a super-admin (prevents cross-farm admin leakage). */
export async function assertCan(
  userId: string,
  functionality: string,
  irrigationFieldId: string,
  permission: Permission
): Promise<void> {
  const allowed = irrigationFieldId
    ? await can(userId, functionality, irrigationFieldId, permission)
    : await isSuperAdmin(userId)
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Missing ${permission} on ${functionality}.`,
    })
  }
}

/** Throw FORBIDDEN unless the permission is granted somewhere on the farm.
 *  An empty farm scope requires a super-admin. */
export async function assertCanOnFarm(
  userId: string,
  functionality: string,
  farmId: string,
  permission: Permission
): Promise<void> {
  const allowed = farmId
    ? await canOnFarm(userId, functionality, farmId, permission)
    : await isSuperAdmin(userId)
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Missing ${permission} on ${functionality} for this farm.`,
    })
  }
}

/** Throw FORBIDDEN unless the user is an admin of this farm (or super-admin).
 *  Used for role assignment and other admin-of-farm decisions. */
export async function assertAdminOfFarm(userId: string, farmId: string): Promise<void> {
  if (!farmId) {
    if (await isSuperAdmin(userId)) return
    throw new TRPCError({ code: "FORBIDDEN", message: "Farm admin access required." })
  }
  if (await isAdminOfFarm(userId, farmId)) return
  throw new TRPCError({ code: "FORBIDDEN", message: "Farm admin access required." })
}

/**
 * Throw FORBIDDEN unless the actor may see/manage the target user:
 *  - super-admins manage everyone;
 *  - better-auth super-admins (`role === "admin"`) are only manageable by
 *    other super-admins;
 *  - farm admins are only manageable by super-admins or admins of one of the
 *    same farms;
 *  - everyone else is manageable by anyone who already passed the check.
 */
export async function assertCanManageUser(actorId: string, targetUserId: string): Promise<void> {
  const [actorFarms, target] = await Promise.all([
    getAdminFarmIds(actorId),
    prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } }),
  ])
  if (!target) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." })
  }
  if (target.role === "admin") {
    if (actorFarms === "ALL") return
    throw new TRPCError({ code: "FORBIDDEN", message: "Super-admins are managed by super-admins only." })
  }

  const targetFarms = await getAdminFarmIds(targetUserId)
  if (targetFarms === "ALL") {
    if (actorFarms === "ALL") return
    throw new TRPCError({ code: "FORBIDDEN", message: "This admin is managed by super-admins only." })
  }
  if (targetFarms.size === 0) return // regular user

  for (const f of targetFarms) {
    if (actorFarms === "ALL" || actorFarms.has(f)) return
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "Admins are only manageable within their farm." })
}