import { z } from "zod";
import { prisma } from "../../../prisma/lib/prisma";
import type { Prisma } from "../../../generated/prisma/client";
import { protectedProc, router } from "../trpc";
import { auth } from "../../lib/auth";
import { audit } from "../../lib/audit";
import {
  assertAdminOfFarm,
  assertCan,
  assertCanManageUser,
  getAdminFarmIds,
  isSuperAdmin,
} from "@/lib/permissions";
import { headers } from "next/headers";


export const userRouter = router({
  // ── Get all users (visibility-aware) ───────────────────────────
  getAll: protectedProc.query(async ({ ctx }) => {
    const viewerSuper = await isSuperAdmin(ctx.user.id);
    const viewerAdminFarms = await getAdminFarmIds(ctx.user.id);

    const users = await prisma.user.findMany({
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
            fk_farmingUnit: true,
            irrigationField: { select: { name: true, fk_FarmingUnit: true } },
            farmingUnit: { select: { name: true } },
          },
        },
      },
    });

    // Visibility rules:
    //  - Better Auth super-admins (role === "admin") are only visible to
    //    other super-admins.
    //  - Farm admins (ADMIN membership) are only visible to their own farm
    //    admins or to a super-admin.
    //  - Everyone else is visible normally.
    return users.filter((u) => {
      if (u.role === "admin") return viewerSuper;

      let globalAdmin = false;
      const adminFarms = new Set<string>();
      for (const m of u.roleMembers) {
        if (m.fk_role !== "ADMIN") continue;
        if (m.fk_irrigationField === null && m.fk_farmingUnit === null) globalAdmin = true;
        else if (m.fk_farmingUnit) adminFarms.add(m.fk_farmingUnit);
        else if (m.fk_irrigationField && m.irrigationField?.fk_FarmingUnit) {
          adminFarms.add(m.irrigationField.fk_FarmingUnit);
        }
      }

      if (globalAdmin) return viewerAdminFarms === "ALL";
      if (adminFarms.size === 0) return true;

      if (viewerAdminFarms === "ALL") return true;
      for (const f of adminFarms) {
        if (viewerAdminFarms.has(f)) return true;
      }
      return viewerSuper;
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
        irrigationFieldId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, password, name, irrigationFieldId, ...rest } = input;

      await assertCan(ctx.user.id, "users", irrigationFieldId ?? "", "canCreate");

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
        irrigationFieldId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, password, email, isActive, irrigationFieldId, ...rest } = input;
      const reqHeaders = await headers()

      await assertCan(ctx.user.id, "users", irrigationFieldId ?? "", "canUpdate");
      await assertCanManageUser(ctx.user.id, id);

      const old = await prisma.user.findUnique({
        where: { id },
        select: { name: true, email: true, isActive: true, address: true },
      });

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
    .input(z.object({ id: z.string(), isActive: z.boolean(), irrigationFieldId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await assertCan(ctx.user.id, "users", input.irrigationFieldId ?? "", "canUpdate");
      await assertCanManageUser(ctx.user.id, input.id);

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
    .input(z.object({ id: z.string(), irrigationFieldId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await assertCan(ctx.user.id, "users", input.irrigationFieldId ?? "", "canDelete");
      await assertCanManageUser(ctx.user.id, input.id);

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

  // ── Assign role (field or farm scope) ─────────────────────────
  assignRole: protectedProc
    .input(
      z.object({
        fk_user: z.string(),
        fk_role: z.string(),
        fk_irrigationField: z.string().optional(),
        fk_farmingUnit: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Field/farm assignments need an admin of the target farm;
      // global (scope-less) assignments are super-admin only.
      if (!input.fk_irrigationField && !input.fk_farmingUnit) {
        if (!(await isSuperAdmin(ctx.user.id))) {
          throw new Error("FORBIDDEN: rôle global réservé aux super-admins.");
        }
      } else {
        const farmId = input.fk_farmingUnit
          ?? (input.fk_irrigationField
            ? (await prisma.irrigationField.findUnique({
                where: { id: input.fk_irrigationField },
                select: { fk_FarmingUnit: true },
              }))?.fk_FarmingUnit
            : null);
        if (!farmId) throw new Error("FORBIDDEN: ferme introuvable.");
        await assertAdminOfFarm(ctx.user.id, farmId);
      }

      // The target user must be manageable by the actor.
      await assertCanManageUser(ctx.user.id, input.fk_user);

      const existing = await prisma.roleMember.findFirst({
        where: {
          fk_user:            input.fk_user,
          fk_role:            input.fk_role,
          fk_irrigationField: input.fk_irrigationField ?? null,
          fk_farmingUnit:     input.fk_farmingUnit ?? null,
        },
        select: { id: true, fk_role: true },
      });

      const member = existing
        ? existing
        : await prisma.roleMember.create({
            data: {
              fk_user:            input.fk_user,
              fk_role:            input.fk_role,
              fk_irrigationField: input.fk_irrigationField ?? null,
              fk_farmingUnit:     input.fk_farmingUnit ?? null,
            },
          });

      await audit({
        tableName: "RoleMember",
        rowId: member.id,
        action: existing ? "UPDATE" : "INSERT",
        oldValue: existing ? { fk_role: existing.fk_role } : null,
        newValue: {
          fk_user:            input.fk_user,
          fk_role:            input.fk_role,
          fk_irrigationField: input.fk_irrigationField ?? null,
          fk_farmingUnit:     input.fk_farmingUnit ?? null,
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
        select: { fk_user: true, fk_role: true, fk_irrigationField: true, fk_farmingUnit: true },
      });
      if (!old) throw new Error("NOT_FOUND: membre introuvable.");

      // Admin of the member's farm (or super-admin for global memberships).
      const farmId =
        old.fk_farmingUnit
        ?? (old.fk_irrigationField
          ? (await prisma.irrigationField.findUnique({
              where: { id: old.fk_irrigationField },
              select: { fk_FarmingUnit: true },
            }))?.fk_FarmingUnit
          : null);

      if (farmId) {
        await assertAdminOfFarm(ctx.user.id, farmId);
      } else if (!(await isSuperAdmin(ctx.user.id))) {
        throw new Error("FORBIDDEN: rôle global réservé aux super-admins.");
      }

      if (old.fk_user) await assertCanManageUser(ctx.user.id, old.fk_user);

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