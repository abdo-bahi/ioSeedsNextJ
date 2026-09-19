-- CreateEnum
CREATE TYPE "NotifChannel" AS ENUM ('INAPP', 'EMAIL', 'BOTH', 'NONE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MIN_THRESHOLD', 'MAX_THRESHOLD', 'ACTUATOR_MANUAL', 'ACTUATOR_AUTO', 'MCU_INACTIVE', 'DEVICE_INACTIVE');

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "fk_user" TEXT NOT NULL,
    "minThreshold" "NotifChannel" NOT NULL DEFAULT 'INAPP',
    "maxThreshold" "NotifChannel" NOT NULL DEFAULT 'INAPP',
    "actuatorManual" "NotifChannel" NOT NULL DEFAULT 'INAPP',
    "actuatorAuto" "NotifChannel" NOT NULL DEFAULT 'INAPP',
    "mcuInactive" "NotifChannel" NOT NULL DEFAULT 'INAPP',
    "deviceInactive" "NotifChannel" NOT NULL DEFAULT 'INAPP',

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fk_user" TEXT NOT NULL,
    "fk_sensor" TEXT,
    "fk_actuator" TEXT,
    "fk_mcu" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_fk_user_key" ON "NotificationPreference"("fk_user");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fk_sensor_fkey" FOREIGN KEY ("fk_sensor") REFERENCES "Sensor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fk_actuator_fkey" FOREIGN KEY ("fk_actuator") REFERENCES "Actuator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fk_mcu_fkey" FOREIGN KEY ("fk_mcu") REFERENCES "MCU"("id") ON DELETE SET NULL ON UPDATE CASCADE;
