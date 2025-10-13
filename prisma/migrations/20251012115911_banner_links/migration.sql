-- AlterTable
ALTER TABLE "public"."Banner" ADD COLUMN     "category" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "public"."BannerItem" ADD COLUMN     "productId" TEXT DEFAULT '';
