-- DropForeignKey
ALTER TABLE "Actions" DROP CONSTRAINT "Actions_fk_actuator_fkey";

-- DropForeignKey
ALTER TABLE "EnvironmentData" DROP CONSTRAINT "EnvironmentData_fk_action_fkey";

-- DropForeignKey
ALTER TABLE "EnvironmentData" DROP CONSTRAINT "EnvironmentData_fk_sensor_fkey";

-- AddForeignKey
ALTER TABLE "EnvironmentData" ADD CONSTRAINT "EnvironmentData_fk_sensor_fkey" FOREIGN KEY ("fk_sensor") REFERENCES "Sensor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentData" ADD CONSTRAINT "EnvironmentData_fk_action_fkey" FOREIGN KEY ("fk_action") REFERENCES "Actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actions" ADD CONSTRAINT "Actions_fk_actuator_fkey" FOREIGN KEY ("fk_actuator") REFERENCES "Actuator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
