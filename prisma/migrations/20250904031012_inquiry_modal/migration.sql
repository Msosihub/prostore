-- AlterTable
ALTER TABLE "public"."Quote" ADD COLUMN     "buyerId" TEXT,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "quantity" DECIMAL(12,2);
