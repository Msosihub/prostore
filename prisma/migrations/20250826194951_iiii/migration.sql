/*
  Warnings:

  - A unique constraint covering the columns `[buyerId,supplierId]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Conversation_buyerId_supplierId_productId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_buyerId_supplierId_key" ON "public"."Conversation"("buyerId", "supplierId");
