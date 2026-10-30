-- AlterTable
ALTER TABLE "Actuator" ADD COLUMN     "batteryPercent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "MCU" ADD COLUMN     "batteryPercent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Sensor" ADD COLUMN     "batteryPercent" DOUBLE PRECISION;

-- RenameIndex
ALTER INDEX "RoleMember_fk_user_fk_role_fk_irrigationField_fk_farmingUnit_ke" RENAME TO "RoleMember_fk_user_fk_role_fk_irrigationField_fk_farmingUni_key";
