/*
  Warnings:

  - A unique constraint covering the columns `[conversationId,productId]` on the table `Inquiry` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_conversationId_productId_key" ON "public"."Inquiry"("conversationId", "productId");
