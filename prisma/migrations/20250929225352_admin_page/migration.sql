-- AlterTable
ALTER TABLE "public"."AuditLog" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'NO_NAME';

-- AlterTable
ALTER TABLE "public"."SupplierDocument" ADD COLUMN     "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
