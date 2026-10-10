import { z } from "zod"
import { protectedProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"
import { audit } from "../../lib/audit"
import {
  assertAdminOfFarm,
  assertCan,
  getAccessibleFields,
  getPermissions,
  isAdminUser,
  isSuperAdmin,
} from "@/lib/permissions"

// ── Role & matrix management — super-admin or any farm admin ──────────
async function assertMatrixAdmin(userId: string) {
  if (await isAdminUser(userId)) return
  throw new Error("FORBIDDEN: gestion des rôles réservée aux administrateurs.")
}

async function resolveMemberFarm(member: { fk_irrigationField: string | null; fk_farmingUnit: string | null }) {
  if (member.fk_farmingUnit) return member.fk_farmingUnit
  if (member.fk_irrigationField) {
    const field = await prisma.irrigationField.findUnique({
      where: { id: member.fk_irrigationField },
      select: { fk_FarmingUnit: true },
    })
    return field?.fk_FarmingUnit ?? null
  }
  return null
}

export const rbacRouter = router({

  // ── Roles ──────────────────────────────────────────────────────
  getRoles: protectedProc.query(async () => {
    return prisma.role.findMany({
      orderBy: { name: "asc" },
      include: {
        functionalities: {
          include: { functionality: true },
        },
      },
    })
  }),

  createRole: protectedProc
    .input(z.object({ name: z.string().trim().min(1).max(60) }))
    .mutation(async ({ input, ctx }) => {
      await assertMatrixAdmin(ctx.user.id)

      const role = await prisma.role.create({
        data: { name: input.name.toUpperCase() },
      })

      await audit({
        tableName: "Role",
        rowId: role.name,
        action: "INSERT",
        newValue: { name: role.name, isActive: role.isActive },
        fk_user: ctx.user.id,
      })

      return role
    }),

  toggleRole: protectedProc
    .input(z.object({ name: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await assertMatrixAdmin(ctx.user.id)

      const old = await prisma.role.findUnique({
        where: { name: input.name },
        select: { isActive: true },
      })
      const role = await prisma.role.update({
        where: { name: input.name },
        data: { isActive: input.isActive },
      })

      await audit({
        tableName: "Role",
        rowId: role.name,
        action: "UPDATE",
        oldValue: { isActive: old?.isActive ?? null },
        newValue: { isActive: role.isActive },
        fk_user: ctx.user.id,
      })

      return role
    }),

  // ── Functionalities ────────────────────────────────────────────
  getFunctionalities: protectedProc.query(async () => {
    return prisma.functionality.findMany({ orderBy: { name: "asc" } })
  }),

  getRoleFunctionalities: protectedProc
    .input(z.object({ roleName: z.string() }))
    .query(async ({ input }) => {
      return prisma.role_Functionality.findMany({
        where: { fk_role: input.roleName },
        include: { functionality: true },
      })
    }),

  upsertRoleFunctionality: protectedProc
    .input(z.object({
      fk_role:          z.string(),
      fk_functionality: z.string(),
      canCreate:        z.boolean().default(false),
      canRead:          z.boolean().default(true),
      canUpdate:        z.boolean().default(false),
      canDelete:        z.boolean().default(false),
      canToggle:        z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertMatrixAdmin(ctx.user.id)

      const existing = await prisma.role_Functionality.findUnique({
        where: {
          fk_role_fk_functionality: {
            fk_role:          input.fk_role,
            fk_functionality: input.fk_functionality,
          }
        },
        select: {
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
          canToggle: true,
        },
      })

      const rf = await prisma.role_Functionality.upsert({
        where: {
          fk_role_fk_functionality: {
            fk_role:          input.fk_role,
            fk_functionality: input.fk_functionality,
          }
        },
        update: {
          canCreate: input.canCreate,
          canRead:   input.canRead,
          canUpdate: input.canUpdate,
          canDelete: input.canDelete,
          canToggle: input.canToggle,
        },
        create: input,
      })

      await audit({
        tableName: "Role_Functionality",
        rowId: `${rf.fk_role}:${rf.fk_functionality}`,
        action: existing ? "UPDATE" : "INSERT",
        oldValue: existing
          ? {
              canCreate: existing.canCreate,
              canRead: existing.canRead,
              canUpdate: existing.canUpdate,
              canDelete: existing.canDelete,
              canToggle: existing.canToggle,
            }
          : null,
        newValue: {
          canCreate: rf.canCreate,
          canRead: rf.canRead,
          canUpdate: rf.canUpdate,
          canDelete: rf.canDelete,
          canToggle: rf.canToggle,
        },
        fk_user: ctx.user.id,
      })

      return rf
    }),

  // ── My accessible fields (topbar selector) ─────────────────────
  getMyFields: protectedProc.query(async ({ ctx }) => {
    return getAccessibleFields(ctx.user.id)
  }),

  // ── My permissions for a field ─────────────────────────────────
  getMyPermissions: protectedProc
    .input(z.object({
      irrigationFieldId: z.string(),
      functionality:     z.string(),
    }))
    .query(async ({ input, ctx }) => {
      return getPermissions(ctx.user.id, input.functionality, input.irrigationFieldId)
    }),

  // ── Am I an admin (nav visibility for the RBAC page) ───────────
  amIAdmin: protectedProc.query(async ({ ctx }) => {
    return isAdminUser(ctx.user.id)
  }),

  // ── RoleMembers — assign users to roles per scope ──────────────
  getMembersByField: protectedProc
    .input(z.object({ irrigationFieldId: z.string() }))
    .query(async ({ input, ctx }) => {
      await assertCan(ctx.user.id, "users", input.irrigationFieldId, "canRead")

      return prisma.roleMember.findMany({
        where: { fk_irrigationField: input.irrigationFieldId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          role: { select: { name: true, isActive: true } },
        },
        orderBy: { role: { name: "asc" } },
      })
    }),

  getMembersByFarm: protectedProc
    .input(z.object({ farmId: z.string() }))
    .query(async ({ input, ctx }) => {
      await assertAdminOfFarm(ctx.user.id, input.farmId)

      const fieldIds = await prisma.irrigationField.findMany({
        where: { fk_FarmingUnit: input.farmId },
        select: { id: true },
      })

      return prisma.roleMember.findMany({
        where: {
          OR: [
            { fk_farmingUnit: input.farmId },
            { fk_irrigationField: { in: fieldIds.map((f) => f.id) } },
          ],
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          role: { select: { name: true, isActive: true } },
        },
        orderBy: { role: { name: "asc" } },
      })
    }),

  assignRole: protectedProc
    .input(z.object({
      fk_user:            z.string(),
      fk_role:            z.string(),
      fk_irrigationField: z.string().optional(),
      fk_farmingUnit:     z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Global (scope-less) assignments are super-admin only.
      // Field/farm assignments require an admin of the target farm.
      if (!input.fk_irrigationField && !input.fk_farmingUnit) {
        if (!(await isSuperAdmin(ctx.user.id))) {
          throw new Error("FORBIDDEN: rôle global réservé aux super-admins.")
        }
      } else {
        const farmId = input.fk_farmingUnit
          ?? (input.fk_irrigationField
            ? (await prisma.irrigationField.findUnique({
                where: { id: input.fk_irrigationField },
                select: { fk_FarmingUnit: true },
              }))?.fk_FarmingUnit
            : null)
        if (!farmId) throw new Error("FORBIDDEN: ferme introuvable.")
        await assertAdminOfFarm(ctx.user.id, farmId)
      }

      const existing = await prisma.roleMember.findFirst({
        where: {
          fk_user:            input.fk_user,
          fk_role:            input.fk_role,
          fk_irrigationField: input.fk_irrigationField ?? null,
          fk_farmingUnit:     input.fk_farmingUnit ?? null,
        },
        select: { id: true, fk_role: true },
      })

      const member = existing
        ? existing
        : await prisma.roleMember.create({
            data: {
              fk_user:            input.fk_user,
              fk_role:            input.fk_role,
              fk_irrigationField: input.fk_irrigationField ?? null,
              fk_farmingUnit:     input.fk_farmingUnit ?? null,
            },
          })

      await audit({
        tableName: "RoleMember",
        rowId: member.id,
        action: existing ? "UPDATE" : "INSERT",
        oldValue: existing ? { fk_role: existing.fk_role } : null,
        newValue: {
          fk_user:            input.fk_user,
          fk_role:            input.fk_role,
          fk_irrigationField: input.fk_irrigationField ?? null,
          fk_farmingUnit:     input.fk_farmingUnit ?? null,
        },
        fk_user: ctx.user.id,
      })

      return member
    }),

  removeRole: protectedProc
    .input(z.object({ roleMemberId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const old = await prisma.roleMember.findUnique({
        where: { id: input.roleMemberId },
        select: { fk_user: true, fk_role: true, fk_irrigationField: true, fk_farmingUnit: true },
      })
      if (!old) throw new Error("NOT_FOUND: membre introuvable.")

      const farmId = await resolveMemberFarm(old)
      if (farmId) {
        await assertAdminOfFarm(ctx.user.id, farmId)
      } else if (!(await isSuperAdmin(ctx.user.id))) {
        throw new Error("FORBIDDEN: rôle global réservé aux super-admins.")
      }

      await prisma.roleMember.delete({ where: { id: input.roleMemberId } })

      await audit({
        tableName: "RoleMember",
        rowId: input.roleMemberId,
        action: "DELETE",
        oldValue: old,
        fk_user: ctx.user.id,
      })

      return { success: true }
    }),
})