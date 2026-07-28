/*
  Warnings:

  - The `surface` column on the `IrrigationField` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "IrrigationField" DROP COLUMN "surface",
ADD COLUMN     "surface" DOUBLE PRECISION;
