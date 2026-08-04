import { router } from "../trpc"
import { activityRouter } from "./activity.router"
import { actuatorRouter } from "./actuator.router"
import { farmingUnitRouter } from "./farmingUnit.router"
import { fieldRouter } from "./field.router"
import { irrigationFieldRouter } from "./irrigationField.router"
import { mcuRouter } from "./mcu.router"
import { scheduleRouter } from "./schedule.router"
import { sensorRouter } from "./sensor.router"

export const appRouter = router({
  field: fieldRouter,
  irrigationField:  irrigationFieldRouter,
  sensor: sensorRouter,
  mcu: mcuRouter,
  actuator: actuatorRouter,
  activity: activityRouter,
  schedule: scheduleRouter,
  farmingUnit: farmingUnitRouter,
})

export type AppRouter = typeof appRouter