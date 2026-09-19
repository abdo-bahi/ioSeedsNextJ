import { z } from "zod"
import { protectedProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"

const ChannelZ = z.enum(["INAPP", "EMAIL", "BOTH", "NONE"])

export const notificationRouter = router({

  // ── Get unread notifications ──────────────────────────────────
  getUnread: protectedProc
    .query(async ({ ctx }) => {
      return prisma.notification.findMany({
        where:   { fk_user: ctx.user.id, isRead: false },
        orderBy: { createdAt: "desc" },
        take:    20,
      })
    }),

  // ── Get all (with pagination) ─────────────────────────────────
  getAll: protectedProc
    .input(z.object({ skip: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      return prisma.notification.findMany({
        where:   { fk_user: ctx.user.id },
        orderBy: { createdAt: "desc" },
        take:    30,
        skip:    input.skip,
      })
    }),

  // ── Mark as read ──────────────────────────────────────────────
  markRead: protectedProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.notification.updateMany({
        where: { id: input.id, fk_user: ctx.user.id },
        data:  { isRead: true },
      })
    }),

  // ── Mark all as read ──────────────────────────────────────────
  markAllRead: protectedProc
    .mutation(async ({ ctx }) => {
      return prisma.notification.updateMany({
        where: { fk_user: ctx.user.id, isRead: false },
        data:  { isRead: true },
      })
    }),

  // ── Get preferences ───────────────────────────────────────────
  getPreferences: protectedProc
    .query(async ({ ctx }) => {
      const pref = await prisma.notificationPreference.findUnique({
        where: { fk_user: ctx.user.id },
      })

      return pref ?? {
        minThreshold:   "INAPP",
        maxThreshold:   "INAPP",
        actuatorManual: "INAPP",
        actuatorAuto:   "INAPP",
        mcuInactive:    "INAPP",
        deviceInactive: "INAPP",
      }
    }),

  // ── Update preferences ────────────────────────────────────────
  updatePreferences: protectedProc
    .input(z.object({
      minThreshold:   ChannelZ.optional(),
      maxThreshold:   ChannelZ.optional(),
      actuatorManual: ChannelZ.optional(),
      actuatorAuto:   ChannelZ.optional(),
      mcuInactive:    ChannelZ.optional(),
      deviceInactive: ChannelZ.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.notificationPreference.upsert({
        where:  { fk_user: ctx.user.id },
        update: input,
        create: { fk_user: ctx.user.id, ...input },
      })
    }),
})