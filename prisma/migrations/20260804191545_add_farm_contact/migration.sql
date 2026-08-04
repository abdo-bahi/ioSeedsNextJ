-- AlterTable
ALTER TABLE "FarmingUnit" ADD COLUMN     "contact" TEXT;

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "fk_creator" TEXT;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_fk_creator_fkey" FOREIGN KEY ("fk_creator") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
