/*
  Warnings:

  - Made the column `certNumber` on table `Certification` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Certification" ALTER COLUMN "certNumber" SET NOT NULL,
ALTER COLUMN "certNumber" SET DEFAULT '';
