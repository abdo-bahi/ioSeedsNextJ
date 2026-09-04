/*
  Warnings:

  - You are about to drop the column `unit` on the `EnvironmentData` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EnvironmentData" DROP COLUMN "unit";

-- AlterTable
ALTER TABLE "Sensor" ADD COLUMN     "unit" TEXT;
