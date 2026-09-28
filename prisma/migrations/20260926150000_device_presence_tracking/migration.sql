-- AlterTable
ALTER TABLE "MCU" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "Sensor" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "Actuator" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DeviceConnectionLog" (
    "id" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "event" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceConnectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceConnectionLog_deviceId_dateTime_idx" ON "DeviceConnectionLog"("deviceId", "dateTime");
CREATE INDEX "DeviceConnectionLog_deviceType_dateTime_idx" ON "DeviceConnectionLog"("deviceType", "dateTime");