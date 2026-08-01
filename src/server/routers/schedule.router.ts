// src/server/routers/schedule.router.ts
import { z } from "zod"
import { publicProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"

const DaysZ = z.enum(["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"])

export const scheduleRouter = router({

  // ── Get all schedules for a field ─────────────────────────────
  getAllByField: publicProc
    .input(z.object({
      irrigationFieldId: z.string(),
      allFields:         z.boolean().default(false),
      farmId:            z.string().optional(),
    }))
    .query(async ({ input }) => {
      return prisma.schedule.findMany({
        where: input.allFields && input.farmId ? {
          actuator: {
            mcu: {
              irrigationField: { fk_FarmingUnit: input.farmId }
            }
          }
        } : {
          actuator: {
            mcu: { fk_irrigationField: input.irrigationFieldId }
          }
        },
        orderBy: { startAt: "asc" },
        select: {
          id:                 true,
          name:               true,
          repeatEveryDays:    true,
          duration:           true,
          isActive:           true,
          startAt:            true,
          startDate:          true,
          endDate:            true,
          weekDays:           true,
          toggleAtThresholds: true,
          createdAt:          true,
          updatedAt:          true,
          fk_actuator:        true,
          actuator: {
            select: {
              name:        true,
              actuatorType: { select: { name: true } },
              mcu: {
                select: {
                  name:            true,
                  minSoilMoisture: true,
                  irrigationField: { select: { name: true } }
                }
              }
            }
          }
        }
      })
    }),

  // ── Toggle isActive ────────────────────────────────────────────
  toggleActive: publicProc
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.schedule.update({
        where: { id: input.id },
        data:  { isActive: input.isActive }
      })
    }),

  // ── Create ────────────────────────────────────────────────────
  create: publicProc
    .input(z.object({
      name:               z.string().min(1),
      fk_actuator:        z.string(),
      duration:           z.number().min(1),
      startAt:            z.string().optional(),   // "06:00"
      startDate:          z.string().optional(),
      endDate:            z.string().optional(),
      weekDays:           z.array(DaysZ).default([]),
      repeatEveryDays:    z.number().min(0).default(0),
      toggleAtThresholds: z.boolean().default(false),
      isActive:           z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      // Parse time string "06:00" → today's date with that time
      const startAt = input.startAt
        ? new Date(`1970-01-01T${input.startAt}:00.000Z`)
        : null

      return prisma.schedule.create({
        data: {
          name:               input.name,
          fk_actuator:        input.fk_actuator,
          duration:           input.duration,
          startAt,
          startDate:          input.startDate ? new Date(input.startDate) : null,
          endDate:            input.endDate   ? new Date(input.endDate)   : null,
          weekDays:           input.weekDays,
          repeatEveryDays:    input.repeatEveryDays,
          toggleAtThresholds: input.toggleAtThresholds,
          isActive:           input.isActive,
        }
      })
    }),

  // ── Update ────────────────────────────────────────────────────
  update: publicProc
    .input(z.object({
      id:                 z.string(),
      name:               z.string().min(1).optional(),
      fk_actuator:        z.string().optional(),
      duration:           z.number().min(1).optional(),
      startAt:            z.string().optional(),
      startDate:          z.string().optional(),
      endDate:            z.string().optional(),
      weekDays:           z.array(DaysZ).optional(),
      repeatEveryDays:    z.number().min(0).optional(),
      toggleAtThresholds: z.boolean().optional(),
      isActive:           z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, startAt: startAtStr, startDate, endDate, ...rest } = input
      return prisma.schedule.update({
        where: { id },
        data: {
          ...rest,
          ...(startAtStr !== undefined && {
            startAt: startAtStr
              ? new Date(`1970-01-01T${startAtStr}:00.000Z`)
              : null
          }),
          ...(startDate !== undefined && {
            startDate: startDate ? new Date(startDate) : null
          }),
          ...(endDate !== undefined && {
            endDate: endDate ? new Date(endDate) : null
          }),
        }
      })
    }),

  // ── Delete ────────────────────────────────────────────────────
  delete: publicProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.schedule.delete({ where: { id: input.id } })
    }),
})