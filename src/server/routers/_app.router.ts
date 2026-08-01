import { router } from "../trpc"
import { activityRouter } from "./activity.router"
import { actuatorRouter } from "./actuator.router"
import { fieldRouter } from "./field.router"
import { irrigationFieldRouter } from "./irrigationField.router"
import { mcuRouter } from "./mcu.router"
import { sensorRouter } from "./sensor.router"

export const appRouter = router({
  field: fieldRouter,
  irrigationField:  irrigationFieldRouter,
  sensor: sensorRouter,
  mcu: mcuRouter,
  actuator: actuatorRouter,
  activity: activityRouter,
})

export type AppRouter = typeof appRouter