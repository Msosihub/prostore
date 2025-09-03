/*
  Warnings:

  - You are about to drop the column `body` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `Message` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[messageId]` on the table `Inquiry` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Inquiry" ADD COLUMN     "details" TEXT,
ADD COLUMN     "messageId" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "subject" TEXT;

-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "body",
DROP COLUMN "isRead",
DROP COLUMN "sentAt",
ADD COLUMN     "content" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "inquiryId" UUID,
ADD COLUMN     "productId" UUID,
ADD COLUMN     "replyToId" UUID,
ADD COLUMN     "seen" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_messageId_key" ON "public"."Inquiry"("messageId");

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "public"."Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "public"."Inquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
