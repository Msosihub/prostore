/*
  Warnings:

  - You are about to drop the column `targetId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `targetType` on the `AuditLog` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."AuditLog" DROP COLUMN "targetId",
DROP COLUMN "targetType",
ADD COLUMN     "entityId" UUID,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "public"."SupplierDocument" ADD COLUMN     "status" "public"."DocumentStatus" NOT NULL DEFAULT 'PENDING';
