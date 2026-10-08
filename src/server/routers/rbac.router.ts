import { z } from "zod"
import { protectedProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"
import { audit } from "../../lib/audit"
import { assertCan, getPermissions, isAdminUser } from "@/lib/permissions"

// ── Role & permission management — super-admin only ────────────────
async function assertSuperAdmin(userId: string) {
  const ok = await isAdminUser(userId)
  if (!ok) {
    throw new Error("FORBIDDEN: manager roles et accès réservé aux administrateurs.")
  }
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
      await assertSuperAdmin(ctx.user.id)

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
      await assertSuperAdmin(ctx.user.id)

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
      await assertSuperAdmin(ctx.user.id)

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

  // ── RoleMembers — assign users to roles per field ─────────────
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

  assignRole: protectedProc
    .input(z.object({
      fk_user:            z.string(),
      fk_role:            z.string(),
      fk_irrigationField: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertCan(ctx.user.id, "users", input.fk_irrigationField, "canCreate")

      const existing = await prisma.roleMember.findUnique({
        where: {
          fk_user_fk_role_fk_irrigationField: {
            fk_user:            input.fk_user,
            fk_role:            input.fk_role,
            fk_irrigationField: input.fk_irrigationField,
          }
        },
        select: { fk_role: true },
      })

      const member = await prisma.roleMember.upsert({
        where: {
          fk_user_fk_role_fk_irrigationField: {
            fk_user:            input.fk_user,
            fk_role:            input.fk_role,
            fk_irrigationField: input.fk_irrigationField,
          }
        },
        update: {},
        create: input,
      })

      await audit({
        tableName: "RoleMember",
        rowId: member.id,
        action: existing ? "UPDATE" : "INSERT",
        oldValue: existing ? { fk_role: existing.fk_role } : null,
        newValue: {
          fk_user:            input.fk_user,
          fk_role:            input.fk_role,
          fk_irrigationField: input.fk_irrigationField,
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
        select: { fk_user: true, fk_role: true, fk_irrigationField: true },
      })

      if (!old?.fk_irrigationField) {
        throw new Error("FORBIDDEN: rôle global — géré manuellement.")
      }

      await assertCan(ctx.user.id, "users", old.fk_irrigationField, "canDelete")

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

  // ── My permissions for a field ─────────────────────────────────
  getMyPermissions: protectedProc
    .input(z.object({
      irrigationFieldId: z.string(),
      functionality:     z.string(),
    }))
    .query(async ({ input, ctx }) => {
      return getPermissions(ctx.user.id, input.functionality, input.irrigationFieldId)
    }),

  // ── Am I a super-admin (used to show/hide the RBAC nav) ────────
  amIAdmin: protectedProc.query(async ({ ctx }) => {
    return isAdminUser(ctx.user.id)
  }),
})