-- AlterTable
ALTER TABLE "user" ADD COLUMN     "fk_farm" TEXT;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_fk_farm_fkey" FOREIGN KEY ("fk_farm") REFERENCES "FarmingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
