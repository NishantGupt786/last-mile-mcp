-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "conversationId" INTEGER,
ADD COLUMN     "humanEscalationId" INTEGER,
ADD COLUMN     "incidentId" INTEGER,
ADD COLUMN     "packagingFeedbackId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_packagingFeedbackId_fkey" FOREIGN KEY ("packagingFeedbackId") REFERENCES "public"."PackagingFeedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_humanEscalationId_fkey" FOREIGN KEY ("humanEscalationId") REFERENCES "public"."HumanEscalation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
