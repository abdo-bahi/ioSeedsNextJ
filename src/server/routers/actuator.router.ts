import { z } from "zod";
import { publicProc, router } from "../trpc";
import { prisma } from "../../../prisma/lib/prisma";
import { publishToMCU } from "@/lib/mqtt-publish";
import { notify } from "@/lib/notifications";
import { TRPCError } from "@trpc/server";
import { syncActuatorsToMCU } from "./device-sync";
import { macAddressZ } from "./sensor.router";
import { audit } from "../../lib/audit";

export const actuatorRouter = router({
  // ── Get all for a field (dashboard quick actions) ─────────────
  getAllByField: publicProc
    .input(z.object({ irrigationFieldId: z.string() }))
    .query(async ({ input }) => {
      return prisma.actuator.findMany({
        where: {
          mcu: { fk_irrigationField: input.irrigationFieldId },
        },
        select: {
          id: true,
          name: true,
          targetState: true,
          toggleTimeLimit: true,
          toggleStartedAt: true,
          lastSeenAt: true,
          isActive: true,
          fk_mcu: true,
          actuatorType: { select: { name: true } },
          actions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { actionVal: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  // ── Get all for data table (with MCU filter) ──────────────────
  getAllByFieldFull: publicProc
    .input(
      z.object({
        irrigationFieldId: z.string(),
        mcuId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const actuators = await prisma.actuator.findMany({
        where: {
          mcu: {
            fk_irrigationField: input.irrigationFieldId,
            ...(input.mcuId ? { id: input.mcuId } : {}),
          },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          macAddress: true,
          latitude: true,
          longitude: true,
          targetState: true,
          toggleTimeLimit: true,
          toggleStartedAt: true,
          lastSeenAt: true,
          isActive: true,
          fk_mcu: true,
          mcu: {
            select: {
              id: true,
              name: true,
              status: true,
              fk_irrigationField: true,
              irrigationField: { select: { name: true } },
            },
          },
          fk_actuatorType: true,
          actuatorType: { select: { name: true } },
          actions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { actionVal: true, createdAt: true },
          },
        },
      });

      return actuators.map((a) => ({
        id: a.id,
        name: a.name,
        macAddress: a.macAddress,
        latitude: a.latitude,
        longitude: a.longitude,
        targetState: a.targetState,
        toggleTimeLimit: a.toggleTimeLimit,
        toggleStartedAt: a.toggleStartedAt,
        lastSeenAt: a.lastSeenAt,
        isActive: a.isActive,
        fk_mcu: a.fk_mcu,
        mcuName: a.mcu?.name ?? "—",
        mcuStatus: a.mcu?.status ?? "OFFLINE",
        fieldName: a.mcu?.irrigationField?.name ?? "—",
        fk_irrigationField: a.mcu?.fk_irrigationField ?? "",
        actuatorType: a.fk_actuatorType ?? "—",
        lastAction: a.actions[0] ?? null,
      }));
    }),

  // ── Get actuator types ────────────────────────────────────────
  getTypes: publicProc.query(async () => {
    return prisma.actuatorType.findMany({
      select: { name: true, description: true },
    });
  }),

  // ── Toggle (dashboard quick action) ──────────────────────────
  toggle: publicProc
    .input(
      z.object({
        actuatorId: z.string(),
        newState: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get full context for topic construction
      const actuator = await prisma.actuator.findUnique({
        where: { id: input.actuatorId },
        include: {
          mcu: {
            include: {
              irrigationField: {
                include: { FarmingUnit: true },
              },
            },
          },
        },
      });

      if (!actuator?.mcu) throw new TRPCError({ code: "NOT_FOUND" });

      const farmId = actuator.mcu.irrigationField.FarmingUnit!.id;
      const fieldId = actuator.mcu.fk_irrigationField;
      const mcuId = actuator.fk_mcu!;

      // Create action record — this is the dashboard → MCU command,
      // initially WAITING until the MCU acknowledges it.
      const action = await prisma.actions.create({
        data: {
          actionVal: input.newState,
          sentAt: new Date(),
          fk_actuator: input.actuatorId,
          fk_user:     ctx.session?.user.id,   // ← set = manual
          cmdStatus:   "WAITING",
        },
      });

      // Update targetState optimistically — opening always restarts the countdown
      await prisma.actuator.update({
        where: { id: input.actuatorId },
        data: {
          targetState:     input.newState,
          toggleStartedAt: input.newState ? new Date() : null,
        },
      });

      // ✅ Publish via worker HTTP (retained → broker keeps the latest state)
      await publishToMCU(
        `irrigation/${farmId}/${fieldId}/${mcuId}/actuator/${input.actuatorId}/cmd`,
        {
          commandId: action.id,
          actuatorId: input.actuatorId,
          targetState: input.newState,
        },
        { retain: true }
      );

      await notify({
        type:        "ACTUATOR_MANUAL",
        title:       "👤 Action manuelle",
        message:     `${actuator.name} ${input.newState ? "ouvert" : "fermé"} manuellement`,
        fk_actuator: input.actuatorId,
        fieldId:     actuator.mcu.fk_irrigationField,
      });

      return action;
    }),

  // ── Create ────────────────────────────────────────────────────
  create: publicProc
    .input(
      z.object({
        name: z.string().min(1),
        macAddress: macAddressZ,
        latitude: z.number(),
        longitude: z.number(),
        targetState: z.boolean().default(false),
        toggleTimeLimit: z.number().int().min(1).nullable().optional(),
        isActive: z.boolean().default(true),
        fk_mcu: z.string().optional(),
        fk_actuatorType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.actuator.create({ data: input });

      await audit({
        tableName: "Actuator",
        rowId: created.id,
        action: "INSERT",
        newValue: {
          name: created.name,
          isActive: created.isActive,
          fk_mcu: created.fk_mcu ?? null,
          actuatorType: created.fk_actuatorType ?? null,
          targetState: created.targetState,
        },
        fk_user: ctx.session?.user.id ?? null,
      });

      // Publish the refreshed actuator list to the MCU (retained)
      if (created.fk_mcu) await syncActuatorsToMCU(created.fk_mcu);

      return created;
    }),

  // ── Update ────────────────────────────────────────────────────
  update: publicProc
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        macAddress: macAddressZ,
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        targetState: z.boolean().optional(),
        toggleTimeLimit: z.number().int().min(1).nullable().optional(),
        isActive: z.boolean().optional(),
        fk_mcu: z.string().optional(),
        fk_actuatorType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const prev = await prisma.actuator.findUnique({
        where: { id },
        select: {
          fk_mcu: true,
          name: true,
          macAddress: true,
          latitude: true,
          longitude: true,
          isActive: true,
          targetState: true,
          toggleTimeLimit: true,
          fk_actuatorType: true,
        },
      });

      const updated = await prisma.actuator.update({ where: { id }, data });

      await audit({
        tableName: "Actuator",
        rowId: id,
        action: "UPDATE",
        oldValue: prev ?? null,
        newValue: {
          name: updated.name,
          macAddress: updated.macAddress ?? null,
          latitude: updated.latitude ?? null,
          longitude: updated.longitude ?? null,
          isActive: updated.isActive,
          targetState: updated.targetState,
          toggleTimeLimit: updated.toggleTimeLimit ?? null,
          fk_mcu: updated.fk_mcu ?? null,
          actuatorType: updated.fk_actuatorType ?? null,
        },
        fk_user: ctx.session?.user.id ?? null,
      });

      // Refresh both the old MCU (device moved away) and the new one
      const mcus = new Set<string>();
      if (prev?.fk_mcu) mcus.add(prev.fk_mcu);
      if (updated.fk_mcu) mcus.add(updated.fk_mcu);
      await Promise.all([...mcus].map((m) => syncActuatorsToMCU(m)));

      return updated;
    }),

  // ── Delete ────────────────────────────────────────────────────
  delete: publicProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const prev = await prisma.actuator.findUnique({
        where: { id: input.id },
        select: {
          fk_mcu: true,
          name: true,
          macAddress: true,
          isActive: true,
          targetState: true,
          fk_actuatorType: true,
        },
      });

      await prisma.actuator.delete({ where: { id: input.id } });

      await audit({
        tableName: "Actuator",
        rowId: input.id,
        action: "DELETE",
        oldValue: prev ?? null,
        fk_user: ctx.session?.user.id ?? null,
      });

      if (prev?.fk_mcu) await syncActuatorsToMCU(prev.fk_mcu);
    }),
});
