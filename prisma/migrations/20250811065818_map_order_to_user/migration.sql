-- AlterTable
ALTER TABLE "public"."HumanEscalation" ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."HumanEscalation" ADD CONSTRAINT "HumanEscalation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
