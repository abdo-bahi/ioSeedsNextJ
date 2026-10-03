import { z } from "zod";
import { protectedProc, publicProc, router } from "../trpc";
import { prisma } from "../../../prisma/lib/prisma";
import { MCUStatus, Prisma } from "../../../generated/prisma/client";
import crypto from "crypto";
import { publishToMCU } from "@/lib/mqtt-publish";
import { TRPCError } from "@trpc/server";

const MCUStatusZ = z.enum(["ONLINE", "OFFLINE", "SLEEPING", "ERROR"]);

// Optional MAC address: validates format, normalizes to uppercase "AA:BB:CC:DD:EE:FF"
const macAddressZ = z
  .string()
  .trim()
  .regex(
    /^$|^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/,
    "Format d'adresse MAC invalide. Exemple : AA:BB:CC:DD:EE:FF"
  )
  .optional()
  .transform((v) => (v ? v.toUpperCase().replace(/-/g, ":") : undefined));

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
          lastSeenAt: true,
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
        sleepingTime: z.number().min(5),
        macAddress: macAddressZ,
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
        sleepingTime: z.number().min(5).optional(),
        macAddress: macAddressZ,
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


        // ✅ Publish via worker HTTP (retained → MCU gets the latest config on boot)
        if (data.sleepingTime !== undefined || data.autoControlledIrrigation !== undefined)
        await publishToMCU(
          `irrigation/${farmId}/${fieldId}/${mcuId}/config`,
          {
            sleepingTime: input.sleepingTime ?? null,
            autoControlledIrrigation: input.autoControlledIrrigation  ?? null,
          },
          { retain: true }
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

  // ── Device connectivity log (paginated, date-filtered) ─────────
  getConnectionLog: publicProc
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
        // "YYYY-MM-DD" — full local-day range
        from: z.string().optional(),
        to: z.string().optional(),
        deviceType: z.enum(["MCU", "SENSOR", "ACTUATOR"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, from, to, deviceType } = input;
      const where: Prisma.DeviceConnectionLogWhereInput = {};
      if (deviceType) where.deviceType = deviceType;
      if (from || to) {
        where.dateTime = {};
        if (from) where.dateTime.gte = new Date(`${from}T00:00:00.000`);
        if (to) where.dateTime.lte = new Date(`${to}T23:59:59.999`);
      }

      const [total, items] = await prisma.$transaction([
        prisma.deviceConnectionLog.count({ where }),
        prisma.deviceConnectionLog.findMany({
          where,
          orderBy: { dateTime: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return {
        items,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
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
