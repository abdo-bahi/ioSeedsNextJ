-- CreateTable
CREATE TABLE "Threshold" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fk_sensor" TEXT NOT NULL,
    "fk_actuator" TEXT NOT NULL,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "minValueAction" BOOLEAN,
    "maxValueAction" BOOLEAN,

    CONSTRAINT "Threshold_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Threshold" ADD CONSTRAINT "Threshold_fk_sensor_fkey" FOREIGN KEY ("fk_sensor") REFERENCES "Sensor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Threshold" ADD CONSTRAINT "Threshold_fk_actuator_fkey" FOREIGN KEY ("fk_actuator") REFERENCES "Actuator"("id") ON DELETE CASCADE ON UPDATE CASCADE;