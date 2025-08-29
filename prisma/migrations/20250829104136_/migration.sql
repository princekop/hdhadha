-- AlterTable
ALTER TABLE "public"."Server" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."ServerRole" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;
