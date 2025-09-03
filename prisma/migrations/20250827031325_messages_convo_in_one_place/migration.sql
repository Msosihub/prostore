/*
  Warnings:

  - You are about to drop the column `attachments` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "attachments";

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "thumbnail" TEXT;

-- AlterTable
ALTER TABLE "public"."Supplier" ADD COLUMN     "avatar" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatar" TEXT;

-- CreateTable
CREATE TABLE "public"."Attachment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "url" TEXT NOT NULL,
    "name" TEXT,
    "messageId" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
