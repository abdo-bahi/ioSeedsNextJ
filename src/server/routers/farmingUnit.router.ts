import { z } from "zod"
import { protectedProc, publicProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"
import { audit } from "../../lib/audit"

export const farmingUnitRouter = router({

  // ── Get one farm by id ────────────────────────────────────────
  getById: protectedProc
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await prisma.farmingUnit.findUnique({
        where:  { id: input.id },
        select: {
          id:          true,
          name:        true,
          address:     true,
          description: true,
          isActive:    true,
          createdAt:   true,
          fk_wilaya:   true,
          wilaya:      { select: { id: true, name: true, code: true } },
          fk_owner:    true,
          owner:       { select: { id: true, name: true, email: true } },
          _count: {
            select: { irrigationFields: true }
          }
        }
      })
    }),

  // ── Get all wilayas for select ────────────────────────────────
  getWilayas: publicProc
    .query(async () => {
      return await prisma.wilaya.findMany({
        select:  { id: true, name: true, code: true },
        orderBy: { name: "asc" }
      })
    }),


    getFarmingUnitByUser: publicProc
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: {
          id: input.id,
        },
        select: {
          fk_farm: true,
        },
      });
  
      return user?.fk_farm ?? null;
    }),
  // ── Update farm ───────────────────────────────────────────────
  update: protectedProc
    .input(z.object({
      id:          z.string(),
      name:        z.string().min(1).optional(),
      address:     z.string().optional(),
      description: z.string().optional(),
      fk_wilaya:   z.string().optional(),
      isActive:    z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input

      const old = await prisma.farmingUnit.findUnique({
        where: { id },
        select: {
          name: true, address: true, description: true,
          fk_wilaya: true, isActive: true,
        },
      })

      const farm = await prisma.farmingUnit.update({
        where: { id },
        data,
      })

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
        },
        fk_user: ctx.user.id,
      })

      return farm
    }),
})