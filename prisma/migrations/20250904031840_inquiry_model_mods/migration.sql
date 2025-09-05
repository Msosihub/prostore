-- AlterTable
ALTER TABLE "public"."Inquiry" ADD COLUMN     "buyerId" TEXT,
ADD COLUMN     "productId" TEXT,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "public"."Quote" ALTER COLUMN "leadTime" DROP NOT NULL,
ALTER COLUMN "validity" DROP NOT NULL;
