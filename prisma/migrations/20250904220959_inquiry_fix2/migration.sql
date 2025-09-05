/*
  Warnings:

  - You are about to drop the column `messageId` on the `Inquiry` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Inquiry_messageId_key";

-- AlterTable
ALTER TABLE "public"."Inquiry" DROP COLUMN "messageId";
