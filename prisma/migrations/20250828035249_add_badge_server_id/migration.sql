-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "badgeServerId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_badgeServerId_fkey" FOREIGN KEY ("badgeServerId") REFERENCES "public"."Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;
