import { router } from "../trpc"
import { activityRouter } from "./activity.router"
import { actuatorRouter } from "./actuator.router"
import { farmingUnitRouter } from "./farmingUnit.router"
import { fieldRouter } from "./field.router"
import { irrigationFieldRouter } from "./irrigationField.router"
import { mcuRouter } from "./mcu.router"
import { notificationRouter } from "./notification.router"
import { scheduleRouter } from "./schedule.router"
import { sensorRouter } from "./sensor.router"
import { statisticsRouter } from "./statistics.router"
import { thresholdRouter } from "./threshold.router"
import { userRouter } from "./user.router"

export const appRouter = router({
  field: fieldRouter,
  irrigationField:  irrigationFieldRouter,
  sensor: sensorRouter,
  mcu: mcuRouter,
  actuator: actuatorRouter,
  activity: activityRouter,
  schedule: scheduleRouter,
  farmingUnit: farmingUnitRouter,
  user: userRouter,
  threshold: thresholdRouter,
  notification: notificationRouter,
  stats: statisticsRouter,
})

export type AppRouter = typeof appRouter