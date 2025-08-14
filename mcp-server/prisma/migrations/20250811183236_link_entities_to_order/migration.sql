/*
  Warnings:

  - You are about to drop the column `conversationId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `humanEscalationId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `incidentId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `packagingFeedbackId` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_humanEscalationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_incidentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_packagingFeedbackId_fkey";

-- AlterTable
ALTER TABLE "public"."Conversation" ADD COLUMN     "orderId" INTEGER;

-- AlterTable
ALTER TABLE "public"."HumanEscalation" ADD COLUMN     "orderId" INTEGER;

-- AlterTable
ALTER TABLE "public"."Incident" ADD COLUMN     "orderId" INTEGER;

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "conversationId",
DROP COLUMN "humanEscalationId",
DROP COLUMN "incidentId",
DROP COLUMN "packagingFeedbackId";

-- AlterTable
ALTER TABLE "public"."PackagingFeedback" ADD COLUMN     "orderId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackagingFeedback" ADD CONSTRAINT "PackagingFeedback_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HumanEscalation" ADD CONSTRAINT "HumanEscalation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
