import { z } from "zod"
import { publicProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"

export const mcuRouter = router({
  getAllMcus: publicProc
    .input(z.object({ irrigationFieldId: z.string() }))
    .query(async ({ input }) => {
      return prisma.mCU.findMany({
        where: {
          fk_irrigationField: input.irrigationFieldId 
        },
        select: {
          id:                       true,
          name:                     true,
          isActive:                 true,
          status:                   true,
          minSoilMoisture:          true,
          maxSoilMoisture:          true,
          autoControlledIrrigation: true,
        }
      })
    })
})