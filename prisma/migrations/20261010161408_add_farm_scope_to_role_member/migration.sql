-- Add farm-scope to RoleMember so ADMIN (and other) roles can be saved at farm level
ALTER TABLE "RoleMember" ADD COLUMN "fk_farmingUnit" TEXT;

-- Foreign key to FarmingUnit
ALTER TABLE "RoleMember" ADD CONSTRAINT "RoleMember_fk_farmingUnit_fkey"
  FOREIGN KEY ("fk_farmingUnit") REFERENCES "FarmingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rebuild the unique index to cover the new scope column.
-- Note: Postgres treats NULLs as distinct, so identical (user,role) rows with
-- NULL scope columns are still allowed; code prevents duplicates via findFirst.
DROP INDEX "RoleMember_fk_user_fk_role_fk_irrigationField_key";
CREATE UNIQUE INDEX "RoleMember_fk_user_fk_role_fk_irrigationField_fk_farmingUnit_key"
  ON "RoleMember"("fk_user", "fk_role", "fk_irrigationField", "fk_farmingUnit");