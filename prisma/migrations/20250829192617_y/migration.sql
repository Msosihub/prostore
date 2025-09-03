-- AlterTable
ALTER TABLE "public"."Supplier" ADD COLUMN     "about" TEXT,
ADD COLUMN     "banner" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "tagLine" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "country" TEXT;
