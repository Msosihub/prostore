/*
  Warnings:

  - A unique constraint covering the columns `[conversationId]` on the table `Inquiry` will be added. If there are existing duplicate values, this will fail.
  - Made the column `description` on table `Category` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Category" ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "description" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_conversationId_key" ON "public"."Inquiry"("conversationId");
