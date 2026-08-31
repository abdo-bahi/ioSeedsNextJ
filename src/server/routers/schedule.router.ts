// src/server/routers/schedule.router.ts
import { z } from "zod";
import { protectedProc, publicProc, router } from "../trpc";
import { prisma } from "../../../prisma/lib/prisma";
import { publishToMCU } from "@/lib/mqtt-publish";

const DaysZ = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

// Reusable — gets all active schedules for MCU's actuators
async function getMCUSchedulesPayload(mcuId: string) {
  const schedules = await prisma.schedule.findMany({
    where: {
      actuator: { fk_mcu: mcuId },
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      duration: true,
      startAt: true,
      startDate: true,
      endDate: true,
      weekDays: true,
      repeatEveryDays: true,
      toggleAtThresholds: true,
      fk_actuator: true,
    },
  });

  return schedules.map((s) => ({
    id: s.id,
    name: s.name,
    isActive: s.isActive,
    duration: s.duration,
    startAt: s.startAt?.toISOString() ?? null,
    startDate: s.startDate?.toISOString() ?? null,
    endDate: s.endDate?.toISOString() ?? null,
    weekDays: s.weekDays,
    repeatEveryDays: s.repeatEveryDays,
    toggleAtThresholds: s.toggleAtThresholds,
    actuatorId: s.fk_actuator,
  }));
}

// Get MCU context for topic
async function getMCUContext(mcuId: string) {
  const mcu = await prisma.mCU.findUnique({
    where: { id: mcuId },
    include: {
      irrigationField: {
        include: { FarmingUnit: true },
      },
    },
  });

  if (!mcu) return null;

  return {
    farmId: mcu.irrigationField.FarmingUnit!.id,
    fieldId: mcu.fk_irrigationField,
    mcuId: mcu.id,
  };
}

// Publish all schedules for an MCU
async function syncSchedulesToMCU(mcuId: string) {
  const ctx = await getMCUContext(mcuId);
  if (!ctx) return;

  const schedules = await getMCUSchedulesPayload(mcuId);

  await publishToMCU(
    `irrigation/${ctx.farmId}/${ctx.fieldId}/${ctx.mcuId}/schedules`,
    {
      commandId: `schedules-${Date.now()}`,
      schedules, // full list — MCU replaces its entire schedule list
    }
  );

  console.log(`📤 Synced ${schedules.length} schedules to MCU ${mcuId}`);
}

export const scheduleRouter = router({
  // ── Get all schedules for a field ─────────────────────────────
  getAllByField: publicProc
    .input(
      z.object({
        irrigationFieldId: z.string(),
        allFields: z.boolean().default(false),
        farmId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return prisma.schedule.findMany({
        where:
          input.allFields && input.farmId
            ? {
                actuator: {
                  mcu: {
                    irrigationField: { fk_FarmingUnit: input.farmId },
                  },
                },
              }
            : {
                actuator: {
                  mcu: { fk_irrigationField: input.irrigationFieldId },
                },
              },
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          name: true,
          repeatEveryDays: true,
          duration: true,
          isActive: true,
          startAt: true,
          startDate: true,
          endDate: true,
          weekDays: true,
          toggleAtThresholds: true,
          createdAt: true,
          updatedAt: true,
          fk_actuator: true,
          actuator: {
            select: {
              name: true,
              actuatorType: { select: { name: true } },
              mcu: {
                select: {
                  name: true,
                  minSoilMoisture: true,
                  irrigationField: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    }),

  // ── Create ────────────────────────────────────────────────────
  create: protectedProc
    .input(
      z.object({
        name: z.string().min(1),
        fk_actuator: z.string(),
        duration: z.number().min(1),
        startAt: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        weekDays: z.array(DaysZ).default([]),
        repeatEveryDays: z.number().min(0).default(0),
        toggleAtThresholds: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      // Parse time string "06:00" → today's date with that time
      const startAt = input.startAt
        ? new Date(`1970-01-01T${input.startAt}:00.000Z`)
        : null;

      const schedule = await prisma.schedule.create({
        data: {
          name: input.name,
          fk_actuator: input.fk_actuator,
          duration: input.duration,
          startAt,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          weekDays: input.weekDays,
          repeatEveryDays: input.repeatEveryDays,
          toggleAtThresholds: input.toggleAtThresholds,
          isActive: input.isActive,
        },
        include: {
          actuator: {
            select: { fk_mcu: true },
          },
        },
      });

      // Sync all schedules to MCU after create
      if (schedule.actuator.fk_mcu) {
        await syncSchedulesToMCU(schedule.actuator.fk_mcu);
      }

      return schedule;
    }),

  // ── Update ────────────────────────────────────────────────────
  update: publicProc
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        fk_actuator: z.string().optional(),
        duration: z.number().min(1).optional(),
        startAt: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        weekDays: z.array(DaysZ).optional(),
        repeatEveryDays: z.number().min(0).optional(),
        toggleAtThresholds: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, startAt, startDate, endDate, ...rest } = input;

      const updated = await prisma.schedule.update({
        where: { id },
        data: {
          ...rest,
          ...(startAt !== undefined && {
            startAt: startAt ? new Date(`1970-01-01T${startAt}:00Z`) : null,
          }),
          ...(startDate !== undefined && {
            startDate: startDate ? new Date(startDate) : null,
          }),
          ...(endDate !== undefined && {
            endDate: endDate ? new Date(endDate) : null,
          }),
        },
        include: { actuator: { select: { fk_mcu: true } } },
      });

      // Sync after update
      if (updated.actuator.fk_mcu) {
        await syncSchedulesToMCU(updated.actuator.fk_mcu);
      }

      return updated;
    }),

  toggleActive: protectedProc
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const updated = await prisma.schedule.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
        include: { actuator: { select: { fk_mcu: true } } },
      });

      // Sync after toggle
      if (updated.actuator.fk_mcu) {
        await syncSchedulesToMCU(updated.actuator.fk_mcu);
      }

      return updated;
    }),

  delete: protectedProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Get MCU before deleting
      const schedule = await prisma.schedule.findUnique({
        where: { id: input.id },
        include: { actuator: { select: { fk_mcu: true } } },
      });

      await prisma.schedule.delete({ where: { id: input.id } });

      // Sync after delete — MCU gets updated list without deleted schedule
      if (schedule?.actuator.fk_mcu) {
        await syncSchedulesToMCU(schedule.actuator.fk_mcu);
      }

      return { success: true };
    }),
});
