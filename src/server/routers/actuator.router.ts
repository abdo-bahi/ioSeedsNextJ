import { z } from "zod"
import { publicProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"

export const actuatorRouter = router({

  // ── Get all actuators for a field (via MCUs) ──────────────────
  getAllByField: publicProc
    .input(z.object({ irrigationFieldId: z.string() }))
    .query(async ({ input }) => {
      return  await prisma.actuator.findMany({
        where: {
          mcu: { fk_irrigationField: input.irrigationFieldId }
        },
        select: {
          id:          true,
          name:        true,
          targetState: true,
          isActive:    true,
          fk_mcu:      true,
          actuatorType: {
            select: { name: true }
          },
          // Last action to show current real state
          actions: {
            orderBy: { createdAt: "desc" },
            take:    1,
            select:  { actionVal: true, createdAt: true }
          }
        },
        orderBy: { createdAt: "asc" }
      })
    }),

  // ── Toggle actuator (open/close) ──────────────────────────────
  toggle: publicProc
    .input(z.object({
      actuatorId: z.string(),
      newState:   z.boolean(),       
    }))
    .mutation(async ({ input }) => {
      // Create action record
      const action = await prisma.actions.create({
        data: {
          actionVal:   input.newState,
          sentAt:      new Date(),
          fk_actuator: input.actuatorId,
        }
      })

      // Update targetState on actuator
      await prisma.actuator.update({
        where: { id: input.actuatorId },
        data:  { targetState: input.newState }
      })

      return action
    }),
})