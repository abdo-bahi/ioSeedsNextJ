import { auth } from "@/lib/auth"
import { initTRPC, TRPCError } from "@trpc/server"

type Session = typeof auth.$Infer.Session

export type Context = {
  session: Session | null
  headers: Headers
}

const t = initTRPC.context<Context>().create()


export const router     = t.router
export const publicProc = t.procedure

export const protectedProc = t.procedure.use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" })
    }
    return next({
      ctx: { ...ctx, user: ctx.session.user }
    })
  })