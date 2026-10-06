import { z } from "zod";
import { prisma } from "../../../prisma/lib/prisma";
import type { Prisma } from "../../../generated/prisma/client";
import { protectedProc, publicProc, router } from "../trpc";
import { auth } from "../../lib/auth";
import { audit } from "../../lib/audit";
import { headers } from "next/headers";


export const userRouter = router({
  // ── Get all users ─────────────────────────────────────────────
  getAll: publicProc.query(async () => {
    return prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        isActive: true,
        createdAt: true,
        fk_wilaya: true,
        fk_farm: true,
        role: true,
        wilaya: { select: { name: true, code: true } },
        roleMembers: {
          select: {
            id: true,
            fk_role: true,
            fk_irrigationField: true,
            irrigationField: { select: { name: true } },
          },
        },
      },
    });
  }),

  // ── Connection logs for a user (paginated, date-filterable, newest first) ──
  getConnectionLogs: protectedProc
    .input(
      z.object({
        userId: z.string(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(8),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: Prisma.ConnectionLogWhereInput = { fk_user: input.userId };
      const dateFilter: Prisma.DateTimeFilter = {};
      if (input.from) dateFilter.gte = new Date(`${input.from}T00:00:00.000`);
      if (input.to) dateFilter.lte = new Date(`${input.to}T23:59:59.999`);
      if (input.from || input.to) where.dateTime = dateFilter;

      const [logs, total] = await Promise.all([
        prisma.connectionLog.findMany({
          where,
          orderBy: { dateTime: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          select: {
            id: true,
            dateTime: true,
            ipAddress: true,
            location: true,
            success: true,
          },
        }),
        prisma.connectionLog.count({ where }),
      ]);

      return { logs, total };
    }),

  // ── Create user via Better Auth ───────────────────────────────
  create: protectedProc
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        address: z.string().optional(),
        isActive: z.boolean().default(true),
        fk_wilaya: z.string().optional(),
        fk_farm: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, password, name, ...rest } = input;

      // Step 1 — create via Better Auth (handles password hashing)
      const result = await auth.api
        .signUpEmail({
          body: { email, password, name },
        })
        .catch((e) => console.log("*********** no signup ***********", e));

      if (!result?.user) {
        throw new Error("Failed to create user via Better Auth");
      }

      // Step 2 — update extra fields not handled by Better Auth
      const user = await prisma.user.update({
        where: { id: result.user.id },
        data: {
          address: rest.address,
          isActive: rest.isActive,
          fk_wilaya: rest.fk_wilaya,
          fk_farm: rest.fk_farm,
        },
      });

      await audit({
        tableName: "User",
        rowId: user.id,
        action: "INSERT",
        newValue: {
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          address: user.address ?? null,
        },
        fk_user: ctx.user.id,
      });

      return user;
    }),

  // ── Update user ───────────────────────────────────────────────
  update: protectedProc
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        isActive: z.boolean().optional(),
        fk_wilaya: z.string().optional(),
        fk_farm: z.string().optional(),
        password: z.string().min(6).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, password, email, isActive, ...rest } = input;
      const reqHeaders = await headers()

      const old = await prisma.user.findUnique({
        where: { id },
        select: { name: true, email: true, isActive: true, address: true },
      });

      const data: any = { ...rest };

      if (email) {
        await auth.api.adminUpdateUser({
          body: {
            userId: id,
            data: {
              email,
            },
          },
          headers: reqHeaders,
        });
      }
      //  Hash directly — no auth.api needed for admin password reset
      if (password) {
        await auth.api
          .setUserPassword({
            body: {
              newPassword: password, // required
              userId: id, // required
            },
            headers: reqHeaders,
          })
          .catch((e) => console.log("cant set password", e));
      }
      if(!isActive){
        await auth.api.revokeUserSessions({
          body: { userId: id },
          headers: reqHeaders,
        });
      }

      // Update other fields directly in Prisma
      const updated = await prisma.user.update({
        where: { id },
        data: { isActive, ...rest },
      });

      await audit({
        tableName: "User",
        rowId: id,
        action: "UPDATE",
        oldValue: {
          name: old?.name ?? null,
          email: old?.email ?? null,
          isActive: old?.isActive ?? null,
          address: old?.address ?? null,
        },
        newValue: {
          name: updated.name,
          email: updated.email,
          isActive: updated.isActive,
          address: updated.address ?? null,
        },
        fk_user: ctx.user.id,
      });

      return updated;
    }),

  // ── Toggle isActive ───────────────────────────────────────────
  toggleActive: protectedProc
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const old = await prisma.user.findUnique({
        where: { id: input.id },
        select: { isActive: true },
      });

      const updated = await prisma.user.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });

      await audit({
        tableName: "User",
        rowId: input.id,
        action: "UPDATE",
        oldValue: { isActive: old?.isActive ?? null },
        newValue: { isActive: input.isActive },
        fk_user: ctx.user.id,
      });

      return updated;
    }),

  // ── Delete user ───────────────────────────────────────────────
  delete: protectedProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const old = await prisma.user.findUnique({
        where: { id: input.id },
        select: { name: true, email: true, isActive: true },
      });

      const deleted = await prisma.user.delete({
        where: { id: input.id },
      });

      await audit({
        tableName: "User",
        rowId: input.id,
        action: "DELETE",
        oldValue: {
          name: old?.name ?? null,
          email: old?.email ?? null,
          isActive: old?.isActive ?? null,
        },
        fk_user: ctx.user.id,
      });

      return deleted;
    }),

  // ── Assign role ───────────────────────────────────────────────
  assignRole: protectedProc
    .input(
      z.object({
        fk_user: z.string(),
        fk_role: z.string(),
        fk_irrigationField: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.roleMember.findUnique({
        where: {
          fk_user_fk_role_fk_irrigationField: {
            fk_user: input.fk_user,
            fk_role: input.fk_role,
            fk_irrigationField: input.fk_irrigationField ?? "",
          },
        },
        select: { fk_role: true, fk_irrigationField: true },
      });

      const member = await prisma.roleMember.upsert({
        where: {
          fk_user_fk_role_fk_irrigationField: {
            fk_user: input.fk_user,
            fk_role: input.fk_role,
            fk_irrigationField: input.fk_irrigationField ?? "",
          },
        },
        update: {},
        create: input,
      });

      await audit({
        tableName: "RoleMember",
        rowId: member.id,
        action: existing ? "UPDATE" : "INSERT",
        oldValue: existing
          ? {
              fk_role: existing.fk_role,
              fk_irrigationField: existing.fk_irrigationField ?? null,
            }
          : null,
        newValue: {
          fk_user: input.fk_user,
          fk_role: input.fk_role,
          fk_irrigationField: input.fk_irrigationField ?? null,
        },
        fk_user: ctx.user.id,
      });

      return member;
    }),

  // ── Remove role ───────────────────────────────────────────────
  removeRole: protectedProc
    .input(z.object({ roleMemberId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const old = await prisma.roleMember.findUnique({
        where: { id: input.roleMemberId },
        select: { fk_user: true, fk_role: true, fk_irrigationField: true },
      });

      const deleted = await prisma.roleMember.delete({
        where: { id: input.roleMemberId },
      });

      await audit({
        tableName: "RoleMember",
        rowId: input.roleMemberId,
        action: "DELETE",
        oldValue: old ?? null,
        fk_user: ctx.user.id,
      });

      return deleted;
    }),
});
