-- AlterTable
ALTER TABLE "public"."Certification" ADD COLUMN     "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "documentId" UUID,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibleToBuyers" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "certNumber" DROP NOT NULL,
ALTER COLUMN "validUntil" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."SupplierDocument" ADD COLUMN     "certNumber" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "validUntil" TIMESTAMP(3),
ADD COLUMN     "visibleToBuyers" BOOLEAN NOT NULL DEFAULT false;
