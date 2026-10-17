import { auth } from "@/lib/auth"
import { prisma } from "../../prisma/lib/prisma"
import { initTRPC, TRPCError } from "@trpc/server"

type Session = typeof auth.$Infer.Session

export type Context = {
  session: Session | null
  headers: Headers
}

const t = initTRPC.context<Context>().create()


export const router     = t.router
export const publicProc = t.procedure

export const protectedProc = t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" })
    }
    const user = ctx.session.user

    // Super-admins bypass farm checks; everyone else is blocked when their
    // farm has been deactivated (defense in depth on top of the sign-in hook).
    if (user.role !== "admin") {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { fk_farm: true },
      })
      if (dbUser?.fk_farm) {
        const farm = await prisma.farmingUnit.findUnique({
          where: { id: dbUser.fk_farm },
          select: { isActive: true },
        })
        if (farm && farm.isActive === false) {
          throw new TRPCError({ code: "FORBIDDEN", message: "FARM_INACTIVE" })
        }
      }
    }

    return next({
      ctx: { ...ctx, user }
    })
  })

export const adminProc = t.procedure.use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" })
    }
    if (ctx.session.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" })
    }
    return next({
      ctx: { ...ctx, user: ctx.session.user }
    })
  })