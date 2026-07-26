import { router } from "../trpc"
import { activityRouter } from "./activity.router"
import { actuatorRouter } from "./actuator.router"
import { fieldRouter } from "./field.router"
import { mcuRouter } from "./mcu.router"
import { sensorRouter } from "./sensors.router"

export const appRouter = router({
  field: fieldRouter,
  sensor: sensorRouter,
  mcu: mcuRouter,
  actuator: actuatorRouter,
  activity: activityRouter,
})

export type AppRouter = typeof appRouter