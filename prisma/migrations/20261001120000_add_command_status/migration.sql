-- Command tracking: lifecycle of dashboard → MCU commands
CREATE TYPE "CommandStatus" AS ENUM ('WAITING', 'DELIVERED', 'EXECUTED', 'FAILED');

-- AlterTable
ALTER TABLE "Actions" ADD COLUMN "cmdStatus" "CommandStatus";