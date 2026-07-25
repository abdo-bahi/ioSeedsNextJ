// src/server/routers/sensor.router.ts
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
})