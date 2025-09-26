/*
  Warnings:

  - You are about to drop the column `returnPolicy` on the `SupplierPolicy` table. All the data in the column will be lost.
  - You are about to drop the column `shippingPolicy` on the `SupplierPolicy` table. All the data in the column will be lost.
  - You are about to drop the column `warrantyInfo` on the `SupplierPolicy` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Supplier" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "businessHours" JSONB,
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "country" TEXT;

-- AlterTable
ALTER TABLE "public"."SupplierPolicy" DROP COLUMN "returnPolicy",
DROP COLUMN "shippingPolicy",
DROP COLUMN "warrantyInfo",
ADD COLUMN     "additionalInfo" JSON;
