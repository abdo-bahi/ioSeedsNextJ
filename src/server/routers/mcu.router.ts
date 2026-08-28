import { z } from "zod";
import { protectedProc, publicProc, router } from "../trpc";
import { prisma } from "../../../prisma/lib/prisma";
import { MCUStatus } from "../../../generated/prisma/client";
import crypto from "crypto";
import { publishToMCU } from "@/lib/mqtt-publish";
import { TRPCError } from "@trpc/server";

const MCUStatusZ = z.enum(["ONLINE", "OFFLINE", "SLEEPING", "ERROR"]);

export const mcuRouter = router({
  // ── Get all MCUs for a field ────────────────────────────────────
  getAllMcus: publicProc
    .input(z.object({ irrigationFieldId: z.string() }))
    .query(async ({ input }) => {
      return await prisma.mCU.findMany({
        where: { fk_irrigationField: input.irrigationFieldId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          isActive: true,
          status: true,
          minSoilMoisture: true,
          maxSoilMoisture: true,
          sleepingTime: true,
          macAddress: true,
          autoControlledIrrigation: true,
          createdAt: true,
          fk_irrigationField: true,
          updatedAt: true,
          // sensor + actuator counts
          _count: {
            select: {
              sensors: true,
              actuators: true,
            },
          },
        },
      });
    }),

  // ── Create ──────────────────────────────────────────────────────
  create: publicProc
    .input(
      z.object({
        fk_irrigationField: z.string(),
        name: z.string().min(1),
        minSoilMoisture: z.number().min(0).max(100),
        maxSoilMoisture: z.number().min(0).max(100),
        sleepingTime: z.number().min(5),
        macAddress: z.string().optional(),
        autoControlledIrrigation: z.boolean().default(true),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      // Auto-generate a secure apiKey — never ask user to provide it
      const apiKey = crypto.randomBytes(32).toString("hex");
      const apiKeyHash = crypto
        .createHash("sha256")
        .update(apiKey)
        .digest("hex");

      const mcu = await prisma.mCU.create({
        data: {
          ...input,
          status: MCUStatus.OFFLINE, // ← always starts OFFLINE updated on connection
          apiKeyHash,
        },
      });

      // Return apiKey in plaintext ONCE — never stored, never retrievable again
      return { ...mcu, apiKey };
    }),

  // ── Update ──────────────────────────────────────────────────────
  update: publicProc
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        minSoilMoisture: z.number().min(0).max(100).optional(),
        maxSoilMoisture: z.number().min(0).max(100).optional(),
        sleepingTime: z.number().min(5).optional(),
        macAddress: z.string().optional(),
        autoControlledIrrigation: z.boolean().optional(),
        isActive: z.boolean().optional(),
        status: MCUStatusZ.optional(),
        fk_irrigationField: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input; 
       const mcu = await prisma.mCU.findUnique({
          where: { id: id },
              include: {
                irrigationField: {
                  include: { FarmingUnit: true },
                },
              },
        })
  
        if (!mcu) throw new TRPCError({ code: "NOT_FOUND" });
  
        const farmId = mcu.irrigationField.FarmingUnit!.id;
        const fieldId = mcu.fk_irrigationField;
        const mcuId = mcu.id;


        // ✅ Publish via worker HTTP — no instrumentation needed
        await publishToMCU(
          `irrigation/${farmId}/${fieldId}/config/${mcuId}/cmd`,
          {
            name: input.name,
            minSoilMoisture: input.minSoilMoisture,
            maxSoilMoisture: input.maxSoilMoisture,
            sleepingTime: input.sleepingTime,
            macAddress: input.macAddress,
            autoControlledIrrigation: input.autoControlledIrrigation,
            isActive: input.isActive,
            status: input.status,
            fk_irrigationField: input.fk_irrigationField,
          }
        )  
        

      return         prisma.mCU.update({
          where: { id },
          data,
        })
    }),

  // ── Delete ──────────────────────────────────────────────────────
  delete: publicProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.mCU.delete({
        where: { id: input.id },
      });
    }),

  // ── Update status only (called by MQTT worker on connect/disconnect) ──
  updateStatus: publicProc
    .input(
      z.object({
        id: z.string(),
        status: MCUStatusZ,
      })
    )
    .mutation(async ({ input }) => {
      return prisma.mCU.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  regenerateApiKey: protectedProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const rawApiKey = crypto.randomBytes(32).toString("hex");
      const apiKeyHash = crypto
        .createHash("sha256")
        .update(rawApiKey)
        .digest("hex");

      await prisma.mCU.update({
        where: { id: input.id },
        data: { apiKeyHash },
      });

      return { apiKey: rawApiKey };
    }),
});
