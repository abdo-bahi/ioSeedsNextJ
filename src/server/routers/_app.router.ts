import { router } from "../trpc"
import { fieldRouter } from "./field.router"

export const appRouter = router({
  field: fieldRouter,
})

export type AppRouter = typeof appRouter