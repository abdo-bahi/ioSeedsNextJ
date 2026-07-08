-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "Days" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "MCUStatus" AS ENUM ('ONLINE', 'OFFLINE', 'SLEEPING', 'ERROR');

-- CreateTable
CREATE TABLE "Wilaya" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Wilaya_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "address" TEXT,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fk_wilaya" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "RoleMember" (
    "id" TEXT NOT NULL,
    "fk_role" TEXT NOT NULL,
    "fk_user" TEXT NOT NULL,
    "fk_irrigationField" TEXT,

    CONSTRAINT "RoleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Functionality" (
    "name" TEXT NOT NULL,

    CONSTRAINT "Functionality_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Role_Functionality" (
    "id" TEXT NOT NULL,
    "fk_role" TEXT NOT NULL,
    "fk_functionality" TEXT NOT NULL,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canUpdate" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Role_Functionality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tableName" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "crudAction" "AuditAction" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "fk_user" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionLog" (
    "id" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "fk_user" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConnectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmingUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fk_wilaya" TEXT,
    "fk_owner" TEXT,

    CONSTRAINT "FarmingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IrrigationField" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fk_FarmingUnit" TEXT NOT NULL,

    CONSTRAINT "IrrigationField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCU" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "minSoilMoisture" DOUBLE PRECISION NOT NULL,
    "maxSoilMoisture" DOUBLE PRECISION NOT NULL,
    "sleepingTime" DOUBLE PRECISION NOT NULL,
    "macAddress" TEXT,
    "autoControlledIrrigation" BOOLEAN NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "status" "MCUStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fk_irrigationField" TEXT NOT NULL,

    CONSTRAINT "MCU_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorType" (
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SensorType_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "ActuatorType" (
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ActuatorType_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Sensor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "macAddress" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "minAnalogue" DOUBLE PRECISION NOT NULL,
    "maxAnalogue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "fk_mcu" TEXT,
    "fk_sensorType" TEXT,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actuator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "macAddress" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "targetState" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "fk_mcu" TEXT,
    "fk_actuatorType" TEXT,

    CONSTRAINT "Actuator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentData" (
    "id" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "rawValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fk_sensor" TEXT NOT NULL,
    "fk_action" TEXT NOT NULL,

    CONSTRAINT "EnvironmentData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actions" (
    "id" TEXT NOT NULL,
    "actionVal" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "ackedAt" TIMESTAMP(3),
    "fk_actuator" TEXT NOT NULL,

    CONSTRAINT "Actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repeatEveryDays" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "weekDays" "Days"[],
    "toggleAtThresholds" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fk_actuator" TEXT NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wilaya_code_key" ON "Wilaya"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Wilaya_name_key" ON "Wilaya"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RoleMember_fk_user_fk_role_fk_irrigationField_key" ON "RoleMember"("fk_user", "fk_role", "fk_irrigationField");

-- CreateIndex
CREATE UNIQUE INDEX "Role_Functionality_fk_role_fk_functionality_key" ON "Role_Functionality"("fk_role", "fk_functionality");

-- CreateIndex
CREATE UNIQUE INDEX "FarmingUnit_fk_owner_name_key" ON "FarmingUnit"("fk_owner", "name");

-- CreateIndex
CREATE UNIQUE INDEX "IrrigationField_fk_FarmingUnit_name_key" ON "IrrigationField"("fk_FarmingUnit", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MCU_fk_irrigationField_name_key" ON "MCU"("fk_irrigationField", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_fk_mcu_name_key" ON "Sensor"("fk_mcu", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Actuator_fk_mcu_name_key" ON "Actuator"("fk_mcu", "name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_fk_wilaya_fkey" FOREIGN KEY ("fk_wilaya") REFERENCES "Wilaya"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleMember" ADD CONSTRAINT "RoleMember_fk_role_fkey" FOREIGN KEY ("fk_role") REFERENCES "Role"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleMember" ADD CONSTRAINT "RoleMember_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleMember" ADD CONSTRAINT "RoleMember_fk_irrigationField_fkey" FOREIGN KEY ("fk_irrigationField") REFERENCES "IrrigationField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role_Functionality" ADD CONSTRAINT "Role_Functionality_fk_role_fkey" FOREIGN KEY ("fk_role") REFERENCES "Role"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role_Functionality" ADD CONSTRAINT "Role_Functionality_fk_functionality_fkey" FOREIGN KEY ("fk_functionality") REFERENCES "Functionality"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionLog" ADD CONSTRAINT "ConnectionLog_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmingUnit" ADD CONSTRAINT "FarmingUnit_fk_wilaya_fkey" FOREIGN KEY ("fk_wilaya") REFERENCES "Wilaya"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmingUnit" ADD CONSTRAINT "FarmingUnit_fk_owner_fkey" FOREIGN KEY ("fk_owner") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrrigationField" ADD CONSTRAINT "IrrigationField_fk_FarmingUnit_fkey" FOREIGN KEY ("fk_FarmingUnit") REFERENCES "FarmingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCU" ADD CONSTRAINT "MCU_fk_irrigationField_fkey" FOREIGN KEY ("fk_irrigationField") REFERENCES "IrrigationField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_fk_mcu_fkey" FOREIGN KEY ("fk_mcu") REFERENCES "MCU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_fk_sensorType_fkey" FOREIGN KEY ("fk_sensorType") REFERENCES "SensorType"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actuator" ADD CONSTRAINT "Actuator_fk_mcu_fkey" FOREIGN KEY ("fk_mcu") REFERENCES "MCU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actuator" ADD CONSTRAINT "Actuator_fk_actuatorType_fkey" FOREIGN KEY ("fk_actuatorType") REFERENCES "ActuatorType"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentData" ADD CONSTRAINT "EnvironmentData_fk_sensor_fkey" FOREIGN KEY ("fk_sensor") REFERENCES "Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentData" ADD CONSTRAINT "EnvironmentData_fk_action_fkey" FOREIGN KEY ("fk_action") REFERENCES "Actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actions" ADD CONSTRAINT "Actions_fk_actuator_fkey" FOREIGN KEY ("fk_actuator") REFERENCES "Actuator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_fk_actuator_fkey" FOREIGN KEY ("fk_actuator") REFERENCES "Actuator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
