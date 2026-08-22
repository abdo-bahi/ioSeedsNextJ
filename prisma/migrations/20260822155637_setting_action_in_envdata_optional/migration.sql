-- DropForeignKey
ALTER TABLE "EnvironmentData" DROP CONSTRAINT "EnvironmentData_fk_action_fkey";

-- AlterTable
ALTER TABLE "EnvironmentData" ALTER COLUMN "fk_action" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "EnvironmentData" ADD CONSTRAINT "EnvironmentData_fk_action_fkey" FOREIGN KEY ("fk_action") REFERENCES "Actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
