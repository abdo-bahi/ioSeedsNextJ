// src/server/routers/irrigationField.router.ts
import { z } from "zod"
import { publicProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"

export const irrigationFieldRouter = router({
  getAllByFarm: publicProc
  .input(z.object({ farmId: z.string() }))
  .query(async ({ input }) => {
    const fields = await prisma.irrigationField.findMany({
      where:   { fk_FarmingUnit: input.farmId },
      orderBy: { createdAt: "asc" },
      select: {
        id:        true,
        name:      true,
        crop:      true,
        surface:   true,
        latitude:  true,
        longitude: true,
        isActive:  true,
        fk_FarmingUnit:  true,
        mcu: {                              
          select: {
            id: true,                      
            sensors: {
              where:  { fk_sensorType: "soil_moisture", isActive: true },
              select: {
                environmentData: {
                  orderBy: { createdAt: "desc" },
                  take:    1,
                  select:  { value: true }
                }
              }
            }
          }
        }
      }
    })

    return fields.map(f => {
      const mcuCount = f.mcu.length

      const moistureValues = f.mcu
        .flatMap(m => m.sensors)
        .flatMap(s => s.environmentData)
        .map(e => e.value)

      const avgMoisture = moistureValues.length
        ? Math.round(
            moistureValues.reduce((a, b) => a + b, 0) / moistureValues.length * 10
          ) / 10
        : null

      return {
        id:          f.id,
        name:        f.name,
        crop:        f.crop,
        surface:     f.surface,
        latitude:    f.latitude,
        longitude:   f.longitude,
        isActive:    f.isActive,
        fk_FarmingUnit:  f.fk_FarmingUnit,
        mcuCount,
        avgMoisture,
      }
    })
  }),
    create: publicProc
    .input(z.object({
      farmId:    z.string(),
      name:      z.string().min(1),
      crop:      z.string().optional(),   // ← fixed
      surface:   z.number().min(1).optional(),   // ← fixed — string
      latitude:  z.number(),
      longitude: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await prisma.irrigationField.create({
        data: {
          name:           input.name,
          crop:           input.crop,
          surface:        input.surface,
          latitude:       input.latitude,
          longitude:      input.longitude,
          isActive:       true,
          fk_FarmingUnit: input.farmId,
        }
      })
    }),

  update: publicProc
    .input(z.object({
      id:        z.string(),
      name:      z.string().min(1).optional(),
      crop:      z.string().optional(),   // ← fixed
      surface:   z.number().min(1).optional(),   // ← fixed
      latitude:  z.number().optional(),
      longitude: z.number().optional(),
      isActive:  z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return await prisma.irrigationField.update({
        where: { id },
        data,
      })
    }),

  delete: publicProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await prisma.irrigationField.delete({
        where: { id: input.id }
      })
    }),
})