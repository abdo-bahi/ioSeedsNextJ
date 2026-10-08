import { prisma } from "../../prisma/lib/prisma"
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

const ALLOWED: PermissionSet = {
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
 * Global super-admin bypass:
 * - Better Auth `user.role === "admin"`
 * - OR the user holds a DB `ADMIN` role on any field (or farm-wide).
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user) return false
  if (user.role === "admin") return true

  const adminMember = await prisma.roleMember.findFirst({
    where: { fk_user: userId, fk_role: "ADMIN" },
    select: { id: true },
  })
  return !!adminMember
}

/**
 * Core check — finds the user's roles for an irrigation field and tests
 * whether ANY of them grants the requested permission. Farm-wide members
 * (`fk_irrigationField: null`) apply on every field.
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
 * Farm-scoped evaluation — used when the resource belongs to a whole farm
 * (e.g. updating a FarmingUnit or creating an IrrigationField) rather than a
 * single field. A user may act on the farm if they hold the permission through
 * ANY of the farm's fields, or through a farm-wide (`null` field) membership.
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
 * All permissions for `functionality` on `irrigationFieldId` in one pass
 * (single set of queries — no per-permission round trips).
 */
export async function getPermissions(
  userId: string,
  functionality: string,
  irrigationFieldId: string
): Promise<PermissionSet> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user) return FORBIDDEN
  if (user.role === "admin") return ALLOWED

  const members = await prisma.roleMember.findMany({
    where: {
      fk_user: userId,
      OR: [
        { fk_irrigationField: irrigationFieldId },
        { fk_irrigationField: null },
      ],
    },
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
 * Farm-scoped variant of {@link getPermissions}. Members holding the
 * permission through ANY field of the farm (or a farm-wide membership)
 * satisfy the check.
 */
export async function getPermissionsOnFarm(
  userId: string,
  functionality: string,
  farmId: string
): Promise<PermissionSet> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user) return FORBIDDEN
  if (user.role === "admin") return ALLOWED

  const fieldIds = await prisma.irrigationField.findMany({
    where: { fk_FarmingUnit: farmId },
    select: { id: true },
  })

  const members = await prisma.roleMember.findMany({
    where: {
      fk_user: userId,
      OR: [
        { fk_irrigationField: { in: fieldIds.map((f) => f.id) } },
        { fk_irrigationField: null },
      ],
    },
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

/** Throw FORBIDDEN unless the permission is granted for the field. */
export async function assertCan(
  userId: string,
  functionality: string,
  irrigationFieldId: string,
  permission: Permission
): Promise<void> {
  const allowed = irrigationFieldId
    ? await can(userId, functionality, irrigationFieldId, permission)
    : await isAdminUser(userId)
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Missing ${permission} on ${functionality}.`,
    })
  }
}

/** Throw FORBIDDEN unless the permission is granted somewhere on the farm. */
export async function assertCanOnFarm(
  userId: string,
  functionality: string,
  farmId: string,
  permission: Permission
): Promise<void> {
  const allowed = farmId
    ? await canOnFarm(userId, functionality, farmId, permission)
    : await isAdminUser(userId)
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Missing ${permission} on ${functionality} for this farm.`,
    })
  }
}