-- AlterTable
ALTER TABLE "public"."Driver" ADD COLUMN     "destination" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "public"."Merchant" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;
