-- AlterTable
ALTER TABLE "public"."Merchant" ADD COLUMN     "inventory" TEXT[];

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "items" TEXT[];
