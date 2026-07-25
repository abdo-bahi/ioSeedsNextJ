import { router } from "../trpc"
import { fieldRouter } from "./field.router"
import { sensorRouter } from "./sensors.router"

export const appRouter = router({
  field: fieldRouter,
  sensor: sensorRouter
})

export type AppRouter = typeof appRouter