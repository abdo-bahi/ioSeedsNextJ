-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "fk_user" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ConnectionLog" ALTER COLUMN "fk_user" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RoleMember" ALTER COLUMN "fk_user" DROP NOT NULL;
