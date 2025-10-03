-- CreateEnum
CREATE TYPE "public"."BannerType" AS ENUM ('PROMO', 'CATEGORY_GROUP');

-- CreateEnum
CREATE TYPE "public"."BannerMode" AS ENUM ('MANUAL', 'AUTO');

-- AlterTable
ALTER TABLE "public"."Banner" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mode" "public"."BannerMode" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "text" TEXT;

-- CreateTable
CREATE TABLE "public"."BannerItem" (
    "id" UUID NOT NULL,
    "image" TEXT NOT NULL,
    "title" TEXT,
    "link" TEXT NOT NULL,
    "bannerId" UUID NOT NULL,

    CONSTRAINT "BannerItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."BannerItem" ADD CONSTRAINT "BannerItem_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "public"."Banner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
