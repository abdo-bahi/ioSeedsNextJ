// src/server/routers/activity.router.ts
import { z } from "zod"
import { publicProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"
import { Prisma } from "../../../generated/prisma/client"

export const activityRouter = router({

  getRecentByField: publicProc
    .input(z.object({
      irrigationFieldId: z.string(),
      page:             z.number().int().min(1).default(1),
      pageSize:         z.number().int().min(1).max(50).default(10),
      // "YYYY-MM-DD" — full local-day range
      from:             z.string().optional(),
      to:               z.string().optional(),
      // Restrict to a single actuator
      actuatorId:       z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { irrigationFieldId, page, pageSize, from, to, actuatorId } = input;
      const where: Prisma.ActionsWhereInput = {
        actuator: {
          mcu: { fk_irrigationField: irrigationFieldId }
        },
        ...(actuatorId ? { fk_actuator: actuatorId } : {}),
      };
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(`${from}T00:00:00.000`);
        if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999`);
      }

      // Get recent actions (valve open/close events)
      const [total, actions] = await prisma.$transaction([
        prisma.actions.count({ where }),
        prisma.actions.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip:    (page - 1) * pageSize,
          take:    pageSize,
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
      ])

      // Format into unified activity items
      const items = actions.map(a => ({
        id:        a.id,
        type:      "valve_action" as const,
        label:     `${a.actuator.name} ${a.actionVal ? "ouvert" : "fermé"}`,
        sublabel:  a.actuator.actuatorType?.name ?? "",
        isOpen:    a.actionVal,
        createdAt: a.createdAt,
        mcu: a.actuator.mcu?.name,
        user: a.user?.name,
        isMcuAction: a.mcuAction
      }))

      return {
        items,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      }
    }),
})