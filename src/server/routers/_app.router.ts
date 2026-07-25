import { router } from "../trpc"
import { fieldRouter } from "./field.router"
import { mcuRouter } from "./mcu.router"
import { sensorRouter } from "./sensors.router"

export const appRouter = router({
  field: fieldRouter,
  sensor: sensorRouter,
  mcu: mcuRouter
})

export type AppRouter = typeof appRouter