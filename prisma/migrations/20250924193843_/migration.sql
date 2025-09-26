/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Supplier" ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_username_key" ON "public"."Supplier"("username");
