-- AlterTable
ALTER TABLE "Actions" ADD COLUMN     "fk_user" TEXT;

-- AlterTable
ALTER TABLE "ActuatorType" ADD COLUMN     "isForIrrigation" BOOLEAN;

-- AddForeignKey
ALTER TABLE "Actions" ADD CONSTRAINT "Actions_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
