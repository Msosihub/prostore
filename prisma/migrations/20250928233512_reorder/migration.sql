-- AlterTable
ALTER TABLE "public"."Category" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Subcategory" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;
