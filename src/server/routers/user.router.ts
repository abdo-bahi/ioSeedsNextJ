import { z } from "zod";
import { prisma } from "../../../prisma/lib/prisma";
import { publicProc, router } from "../trpc";
import { auth } from "../../lib/auth";
import bcrypt from "bcryptjs";
import { authClient } from "@/lib/auth-client";
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

  // ── Create user via Better Auth ───────────────────────────────
  create: publicProc
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
    .mutation(async ({ input }) => {
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

      return user;
    }),

  // ── Update user ───────────────────────────────────────────────
  update: publicProc
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
    .mutation(async ({ input }) => {
      const { id, password, email, ...rest } = input;

      const data: any = { ...rest };
      // if (email) {
      //   const res = await authClient.changeEmail({
      //     newEmail: email,
      //   });
      // }
      if (email) {
        await auth.api.changeEmail({
          body: { newEmail: email },
          headers: new Headers(),
        })
      }
      //  Hash directly — no auth.api needed for admin password reset
      if (password) {
        await authClient.admin
          .setUserPassword({
            newPassword: password, // required
            userId: id, // required
          })
          .catch((e) => console.log("cant set password", e));
      }

      // Update other fields directly in Prisma
      return prisma.user.update({
        where: { id },
        data: { ...rest },
      });
    }),

  // ── Toggle isActive ───────────────────────────────────────────
  toggleActive: publicProc
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.user.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  // ── Delete user ───────────────────────────────────────────────
  delete: publicProc
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.user.delete({
        where: { id: input.id },
      });
    }),

  // ── Assign role ───────────────────────────────────────────────
  assignRole: publicProc
    .input(
      z.object({
        fk_user: z.string(),
        fk_role: z.string(),
        fk_irrigationField: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.roleMember.upsert({
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
    }),

  // ── Remove role ───────────────────────────────────────────────
  removeRole: publicProc
    .input(z.object({ roleMemberId: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.roleMember.delete({
        where: { id: input.roleMemberId },
      });
    }),
});
