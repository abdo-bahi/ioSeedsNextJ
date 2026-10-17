import { z } from "zod"
import { protectedProc, publicProc, router, adminProc } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"
import { audit } from "../../lib/audit"
import { assertCanOnFarm, isSuperAdmin } from "@/lib/permissions"

export const farmingUnitRouter = router({

  // ── Admin-only: list all farms ─────────────────────────────────
  getAll: adminProc.query(async () => {
    return prisma.farmingUnit.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        address: true,
        description: true,
        isActive: true,
        createdAt: true,
        fk_wilaya: true,
        wilaya: { select: { id: true, name: true, code: true } },
        fk_owner: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { irrigationFields: true } },
      },
    })
  }),

  // ── Get one farm by id (any authenticated user of that farm) ───
  getById: protectedProc
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.farmingUnit.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          address: true,
          description: true,
          isActive: true,
          createdAt: true,
          fk_wilaya: true,
          wilaya: { select: { id: true, name: true, code: true } },
          fk_owner: true,
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { irrigationFields: true } },
        },
      })
    }),

  // ── Get all wilayas for select ────────────────────────────────
  getWilayas: publicProc.query(async () => {
    return prisma.wilaya.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    })
  }),

  getFarmingUnitByUser: publicProc
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.id },
        select: { fk_farm: true },
      })
      return user?.fk_farm ?? null
    }),

  // ── Create farm (super-admin) ──────────────────────────────────
  create: adminProc
    .input(
      z.object({
        name:        z.string().trim().min(1),
        address:     z.string().optional(),
        description: z.string().optional(),
        fk_wilaya:   z.string().optional(),
        isActive:    z.boolean().default(true),
        fk_owner:    z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const farm = await prisma.farmingUnit.create({ data: input })

      // Create a default irrigation field so superAdmin can "Enter" immediately
      await prisma.irrigationField.create({
        data: {
          name: "Parcelle 1",
          crop: "Non défini",
          surface: null,
          latitude: 0,
          longitude: 0,
          isActive: true,
          fk_FarmingUnit: farm.id,
        },
      })

      await audit({
        tableName: "FarmingUnit",
        rowId: farm.id,
        action: "INSERT",
        newValue: {
          name:        farm.name ?? null,
          address:     farm.address ?? null,
          description: farm.description ?? null,
          fk_wilaya:   farm.fk_wilaya ?? null,
          isActive:    farm.isActive,
          fk_owner:    farm.fk_owner ?? null,
        },
        fk_user: ctx.user.id,
      })
      return farm
    }),

  // ── Update farm (farm-scoped: farm admins; isActive: super-admin only) ──
  update: protectedProc
    .input(
      z.object({
        id:          z.string(),
        name:        z.string().min(1).optional(),
        address:     z.string().optional(),
        description: z.string().optional(),
        fk_wilaya:   z.string().optional(),
        isActive:    z.boolean().optional(),
        fk_owner:    z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input
      await assertCanOnFarm(ctx.user.id, "farmingUnit", id, "canUpdate")

      const old = await prisma.farmingUnit.findUnique({
        where: { id },
        select: { name: true, address: true, description: true, fk_wilaya: true, isActive: true, fk_owner: true },
      })

      // Deactivating a farm locks every user of that farm out — super-admin only.
      if (input.isActive !== undefined && old && input.isActive !== old.isActive) {
        if (!(await isSuperAdmin(ctx.user.id))) {
          throw new Error("FORBIDDEN: seul un super-admin peut changer le statut de la ferme.")
        }
      }

      const farm = await prisma.farmingUnit.update({ where: { id }, data })
      await audit({
        tableName: "FarmingUnit",
        rowId: id,
        action: "UPDATE",
        oldValue: old ?? null,
        newValue: {
          name:        farm.name ?? null,
          address:     farm.address ?? null,
          description: farm.description ?? null,
          fk_wilaya:   farm.fk_wilaya ?? null,
          isActive:    farm.isActive,
          fk_owner:    farm.fk_owner ?? null,
        },
        fk_user: ctx.user.id,
      })
      return farm
    }),

  // ── Toggle active (super-admin quick action) ───────────────────
  toggleActive: adminProc
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const old = await prisma.farmingUnit.findUnique({
        where: { id: input.id },
        select: { isActive: true },
      })
      const farm = await prisma.farmingUnit.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      })
      await audit({
        tableName: "FarmingUnit",
        rowId: input.id,
        action: "UPDATE",
        oldValue: { isActive: old?.isActive ?? null },
        newValue: { isActive: farm.isActive },
        fk_user: ctx.user.id,
      })
      return farm
    }),

  // ── Fields of a farm (for "enter farm" context) ───────────────
  getFieldsOfFarm: adminProc
    .input(z.object({ farmId: z.string() }))
    .query(async ({ input }) => {
      return prisma.irrigationField.findMany({
        where: { fk_FarmingUnit: input.farmId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, fk_FarmingUnit: true, isActive: true },
      })
    }),

  // ── Farm admins (farm-level ADMIN memberships) ──────────────────
  getFarmAdmins: adminProc
    .input(z.object({ farmId: z.string() }))
    .query(async ({ input }) => {
      return prisma.roleMember.findMany({
        where: { fk_farmingUnit: input.farmId, fk_role: "ADMIN", fk_irrigationField: null },
        select: {
          id: true,
          fk_user: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { id: "asc" },
      })
    }),

  setFarmAdmin: adminProc
    .input(z.object({ farmId: z.string(), userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.roleMember.findFirst({
        where: {
          fk_user:            input.userId,
          fk_role:            "ADMIN",
          fk_farmingUnit:     input.farmId,
          fk_irrigationField: null,
        },
        select: { id: true },
      })
      const member = existing
        ? existing
        : await prisma.roleMember.create({
            data: {
              fk_user:            input.userId,
              fk_role:            "ADMIN",
              fk_farmingUnit:     input.farmId,
              fk_irrigationField: null,
            },
          })
      await audit({
        tableName: "RoleMember",
        rowId: member.id,
        action: existing ? "UPDATE" : "INSERT",
        oldValue: existing ? { fk_role: "ADMIN" } : null,
        newValue: {
          fk_user:            input.userId,
          fk_role:            "ADMIN",
          fk_farmingUnit:     input.farmId,
          fk_irrigationField: null,
        },
        fk_user: ctx.user.id,
      })
      return member
    }),

  removeFarmAdmin: adminProc
    .input(z.object({ roleMemberId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const old = await prisma.roleMember.findUnique({
        where: { id: input.roleMemberId },
        select: { fk_user: true, fk_role: true, fk_farmingUnit: true },
      })
      if (!old) throw new Error("NOT_FOUND")
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
