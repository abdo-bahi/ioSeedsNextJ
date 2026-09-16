import { z } from "zod"
import { protectedProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"

export const thresholdRouter = router({

  // ── Get all thresholds for a field ────────────────────────────
  getAllByField: protectedProc
    .input(z.object({ irrigationFieldId: z.string() }))
    .query(async ({ input }) => {
      return prisma.threshold.findMany({
        where: {
          actuator: {
            mcu: { fk_irrigationField: input.irrigationFieldId }
          }
        },
        orderBy: { priority: "asc" },
        include: {
          sensor:   { select: { name: true, fk_sensorType: true, unit: true } },
          actuator: { select: { name: true, actuatorType: { select: { name: true } } } },
        }
      })
    }),

  // ── Get thresholds for a specific MCU (sent to device) ────────
  getAllByMCU: protectedProc
    .input(z.object({ mcuId: z.string() }))
    .query(async ({ input }) => {
      return prisma.threshold.findMany({
        where: {
          isActive: true,
          actuator: { fk_mcu: input.mcuId }
        },
        orderBy: { priority: "asc" },
        select: {
          id:            true,
          priority:      true,
          minValue:      true,
          maxValue:      true,
          minValueAction: true,
          maxValueAction: true,
          fk_sensor:     true,
          fk_actuator:   true,
        }
      })
    }),

  // ── Create ────────────────────────────────────────────────────
  create: protectedProc
    .input(z.object({
      name:           z.string().optional(),
      priority:       z.number().min(1).default(1),
      isActive:       z.boolean().default(true),
      fk_sensor:      z.string(),
      fk_actuator:    z.string(),
      minValue:       z.number().optional(),
      maxValue:       z.number().optional(),
      minValueAction: z.boolean().optional(),
      maxValueAction: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const threshold = await prisma.threshold.create({ data: input })

      // Sync thresholds to MCU
      const actuator = await prisma.actuator.findUnique({
        where: { id: input.fk_actuator },
        select: { fk_mcu: true }
      })
      if (actuator?.fk_mcu) {
        await syncThresholdsToMCU(actuator.fk_mcu)
      }

      return threshold
    }),

  // ── Update ────────────────────────────────────────────────────
  update: protectedProc
    .input(z.object({
      id:             z.string(),
      name:           z.string().optional(),
      priority:       z.number().min(1).optional(),
      isActive:       z.boolean().optional(),
      fk_sensor:      z.string().optional(),
      fk_actuator:    z.string().optional(),
      minValue:       z.number().nullable().optional(),
      maxValue:       z.number().nullable().optional(),
      minValueAction: z.boolean().nullable().optional(),
      maxValueAction: z.boolean().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const threshold = await prisma.threshold.update({
        where:   { id },
        data,
        include: { actuator: { select: { fk_mcu: true } } }
      })

      if (threshold.actuator.fk_mcu) {
        await syncThresholdsToMCU(threshold.actuator.fk_mcu)
      }

      return threshold
    }),

  // ── Delete ────────────────────────────────────────────────────
  delete: protectedProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const threshold = await prisma.threshold.findUnique({
        where:   { id: input.id },
        include: { actuator: { select: { fk_mcu: true } } }
      })

      await prisma.threshold.delete({ where: { id: input.id } })

      if (threshold?.actuator.fk_mcu) {
        await syncThresholdsToMCU(threshold.actuator.fk_mcu)
      }

      return { success: true }
    }),

  // ── Toggle active ─────────────────────────────────────────────
  toggleActive: protectedProc
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const threshold = await prisma.threshold.update({
        where:   { id: input.id },
        data:    { isActive: input.isActive },
        include: { actuator: { select: { fk_mcu: true } } }
      })

      if (threshold.actuator.fk_mcu) {
        await syncThresholdsToMCU(threshold.actuator.fk_mcu)
      }

      return threshold
    }),
})

// ── Sync all thresholds for an MCU via MQTT ───────────────────────
async function syncThresholdsToMCU(mcuId: string) {
  const { publishToMCU } = await import("@/lib/mqtt-publish")

  const mcu = await prisma.mCU.findUnique({
    where:   { id: mcuId },
    include: {
      irrigationField: { include: { FarmingUnit: true } }
    }
  })

  if (!mcu) return

  const thresholds = await prisma.threshold.findMany({
    where:    { isActive: true, actuator: { fk_mcu: mcuId } },
    orderBy:  { priority: "asc" },
    select: {
      id:             true,
      priority:       true,
      fk_sensor:      true,
      fk_actuator:    true,
      minValue:       true,
      maxValue:       true,
      minValueAction: true,
      maxValueAction: true,
    }
  })

  await publishToMCU(
    `irrigation/${mcu.irrigationField.FarmingUnit!.id}/${mcu.fk_irrigationField}/${mcuId}/thresholds`,
    {
      commandId:  `thresholds-${Date.now()}`,
      thresholds,
    }
  )

  console.log(`📤 Synced ${thresholds.length} thresholds to MCU ${mcu.name}`)
}