import { z } from "zod"
import { publicProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"

export const sensorRouter = router({

    getLatestPerField: publicProc
    .input(z.object({ irrigationFieldId: z.string() }))
    .query(async ({ input }) => {

     // get all sensors for this field
     const sensors = await prisma.sensor.findMany({
      where: {
        isActive: true,
        mcu: {
          fk_irrigationField: input.irrigationFieldId,
          isActive:           true,
        }
      },
      select: {
        id:            true,
        fk_sensorType: true,
        environmentData: {
          orderBy: { createdAt: "desc" },
          take:    1,
          select:  { value: true, unit: true, createdAt: true }
        }
      }
    })
    //in case the sensors where empty
    if (! sensors) {
      return {
        sensorType:  'example',
        average:     0,
        unit:        '%',
        sensorCount: 1,
        lastReadAt:  null,
      }
    }
      // Step 2 — group by sensorType and average the latest values
      const grouped: Record<string, {
        sensorType:   string
        average:      number
        unit:         string
        sensorCount:  number
        lastReadAt:   Date | null
      }> = {}

      for (const sensor of sensors) {
        const type    = sensor.fk_sensorType ?? "unknown"
        const reading = sensor.environmentData[0]  // latest only

        if (!reading) continue  // skip sensors with no data

        if (!grouped[type]) {
          grouped[type] = {
            sensorType:  type,
            average:     0,
            unit:        reading.unit,
            sensorCount: 0,
            lastReadAt:  null,
          }
        }

        // Running sum — divide at the end
        grouped[type].average    += reading.value
        grouped[type].sensorCount += 1

        // Track most recent reading across all sensors of this type
        if (
          !grouped[type].lastReadAt ||
          reading.createdAt > grouped[type].lastReadAt!
        ) {
          grouped[type].lastReadAt = reading.createdAt
        }
      }

      // Step 3 — convert sum to average and return as array
      return Object.values(grouped).map(g => ({
        ...g,
        average: Math.round((g.average / g.sensorCount) * 10) / 10, // 1 decimal
      }))
    }),


  // ── Get all sensors for a field (with optional MCU filter) ────
  getAllByField: publicProc
    .input(z.object({
      irrigationFieldId: z.string(),
      mcuId:             z.string().optional(),
    }))
    .query(async ({ input }) => {
      const sensors = await prisma.sensor.findMany({
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
          minAnalogue: true,
          maxAnalogue: true,
          isActive:    true,
          fk_mcu:      true,
          mcu: {
            select: {
              name:           true,
              fk_irrigationField: true,
              irrigationField: { select: { name: true } }
            }
          },
          fk_sensorType: true,
          sensorType:    { select: { name: true } },
          environmentData: {
            orderBy: { createdAt: "desc" },
            take:    1,
            select:  { value: true, unit: true, createdAt: true }
          }
        }
      })

      return sensors.map(s => ({
        id:            s.id,
        name:          s.name,
        macAddress:    s.macAddress,
        latitude:      s.latitude,
        longitude:     s.longitude,
        minAnalogue:   s.minAnalogue,
        maxAnalogue:   s.maxAnalogue,
        isActive:      s.isActive,
        fk_mcu:        s.fk_mcu,
        mcuName:       s.mcu?.name ?? "—",
        fieldName:     s.mcu?.irrigationField?.name ?? "—",
        sensorType:    s.fk_sensorType ?? "—",
        lastReading:   s.environmentData[0] ?? null,
      }))
    }),

  // ── Get all sensor types ───────────────────────────────────────
  getTypes: publicProc
    .query(async () => {
      return prisma.sensorType.findMany({
        select: { name: true, description: true }
      })
    }),

  // ── Create ────────────────────────────────────────────────────
  create: publicProc
    .input(z.object({
      name:          z.string().min(1),
      macAddress:    z.string().optional(),
      latitude:      z.number(),
      longitude:     z.number(),
      minAnalogue:   z.number(),
      maxAnalogue:   z.number(),
      isActive:      z.boolean().default(true),
      fk_mcu:        z.string().optional(),
      fk_sensorType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return prisma.sensor.create({ data: input })
    }),

  // ── Update ────────────────────────────────────────────────────
  update: publicProc
    .input(z.object({
      id:            z.string(),
      name:          z.string().min(1).optional(),
      macAddress:    z.string().optional(),
      latitude:      z.number().optional(),
      longitude:     z.number().optional(),
      minAnalogue:   z.number().optional(),
      maxAnalogue:   z.number().optional(),
      isActive:      z.boolean().optional(),
      fk_mcu:        z.string().optional(),
      fk_sensorType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return prisma.sensor.update({ where: { id }, data })
    }),

  // ── Delete ────────────────────────────────────────────────────
  delete: publicProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.sensor.delete({ where: { id: input.id } })
    }),
})