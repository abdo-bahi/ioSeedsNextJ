-- CreateTable
CREATE TABLE "ConnectionLog" (
    "id" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "location" TEXT,
    "fk_user" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConnectionLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConnectionLog" ADD CONSTRAINT "ConnectionLog_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;