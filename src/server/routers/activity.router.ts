// src/server/routers/activity.router.ts
import { z } from "zod"
import { publicProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"
import { Select } from "@base-ui/react"

export const activityRouter = router({

  getRecentByField: publicProc
    .input(z.object({
      irrigationFieldId: z.string(),
      limit:             z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      // Get recent actions (valve open/close events)
      const actions = await prisma.actions.findMany({
        where: {
          actuator: {
            mcu: { fk_irrigationField: input.irrigationFieldId }
          }
        },
        orderBy: { createdAt: "desc" },
        take:    input.limit,
        select: {
          id:        true,
          actionVal: true,
          createdAt: true,
          mcuAction: true,
          user: {select: {name:true}},
          actuator: {
            select: {
              name:         true,
              actuatorType: { select: { name: true } },
              mcu: {select: {name: true}}
            }
          }
        }
      })

      // Format into unified activity items
      return actions.map(a => ({
        id:        a.id,
        type:      "valve_action" as const,
        label:     `${a.actuator.name} ${a.actionVal ? "opened" : "closed"}`,
        sublabel:  a.actuator.actuatorType?.name ?? "",
        isOpen:    a.actionVal,
        createdAt: a.createdAt,
        mcu: a.actuator.mcu?.name,
        user: a.user?.name,
        isMcuAction: a.mcuAction
      }))
    }),
})