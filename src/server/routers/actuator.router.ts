import { z } from "zod"
import { publicProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"

export const actuatorRouter = router({

  // ── Get all for a field (dashboard quick actions) ─────────────
  getAllByField: publicProc
    .input(z.object({ irrigationFieldId: z.string() }))
    .query(async ({ input }) => {
      return prisma.actuator.findMany({
        where: {
          mcu: { fk_irrigationField: input.irrigationFieldId }
        },
        select: {
          id:          true,
          name:        true,
          targetState: true,
          isActive:    true,
          fk_mcu:      true,
          actuatorType: { select: { name: true } },
          actions: {
            orderBy: { createdAt: "desc" },
            take:    1,
            select:  { actionVal: true, createdAt: true }
          }
        },
        orderBy: { createdAt: "asc" }
      })
    }),

  // ── Get all for data table (with MCU filter) ──────────────────
  getAllByFieldFull: publicProc
    .input(z.object({
      irrigationFieldId: z.string(),
      mcuId:             z.string().optional(),
    }))
    .query(async ({ input }) => {
      const actuators = await prisma.actuator.findMany({
        where: {
          mcu: {
            fk_irrigationField: input.irrigationFieldId,
            ...(input.mcuId ? { id: input.mcuId } : {}),
          }
        },
        orderBy: { createdAt: "asc" },
        select: {
          id:          true,
          name:        true,
          macAddress:  true,
          latitude:    true,
          longitude:   true,
          targetState: true,
          isActive:    true,
          fk_mcu:      true,
          mcu: {
            select: {
              id:     true,
              name:   true,
              status: true,
              fk_irrigationField: true,
              irrigationField: { select: { name: true } }
            }
          },
          fk_actuatorType: true,
          actuatorType:    { select: { name: true } },
          actions: {
            orderBy: { createdAt: "desc" },
            take:    1,
            select:  { actionVal: true, createdAt: true }
          }
        }
      })

      return actuators.map(a => ({
        id:            a.id,
        name:          a.name,
        macAddress:    a.macAddress,
        latitude:      a.latitude,
        longitude:     a.longitude,
        targetState:   a.targetState,
        isActive:      a.isActive,
        fk_mcu:        a.fk_mcu,
        mcuName:       a.mcu?.name ?? "—",
        mcuStatus:     a.mcu?.status ?? "OFFLINE",
        fieldName:     a.mcu?.irrigationField?.name ?? "—",
        fk_irrigationField: a.mcu?.fk_irrigationField ?? "",
        actuatorType:  a.fk_actuatorType ?? "—",
        lastAction:    a.actions[0] ?? null,
      }))
    }),

  // ── Get actuator types ────────────────────────────────────────
  getTypes: publicProc
    .query(async () => {
      return prisma.actuatorType.findMany({
        select: { name: true, description: true }
      })
    }),

  // ── Toggle (dashboard quick action) ──────────────────────────
  toggle: publicProc
    .input(z.object({
      actuatorId: z.string(),
      newState:   z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const action = await prisma.actions.create({
        data: {
          actionVal:   input.newState,
          sentAt:      new Date(),
          fk_actuator: input.actuatorId,
        }
      })
      await prisma.actuator.update({
        where: { id: input.actuatorId },
        data:  { targetState: input.newState }
      })
      return action
    }),

  // ── Create ────────────────────────────────────────────────────
  create: publicProc
    .input(z.object({
      name:            z.string().min(1),
      macAddress:      z.string().optional(),
      latitude:        z.number(),
      longitude:       z.number(),
      targetState:     z.boolean().default(false),
      isActive:        z.boolean().default(true),
      fk_mcu:          z.string().optional(),
      fk_actuatorType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return prisma.actuator.create({ data: input })
    }),

  // ── Update ────────────────────────────────────────────────────
  update: publicProc
    .input(z.object({
      id:              z.string(),
      name:            z.string().min(1).optional(),
      macAddress:      z.string().optional(),
      latitude:        z.number().optional(),
      longitude:       z.number().optional(),
      targetState:     z.boolean().optional(),
      isActive:        z.boolean().optional(),
      fk_mcu:          z.string().optional(),
      fk_actuatorType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return prisma.actuator.update({ where: { id }, data })
    }),

  // ── Delete ────────────────────────────────────────────────────
  delete: publicProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.actuator.delete({ where: { id: input.id } })
    }),
})