-- CreateEnum
CREATE TYPE "ItemPayoutStatus" AS ENUM ('ESCROW', 'ELIGIBLE', 'REQUESTED', 'PAID');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'TRANSFERRED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "payoutAt" TIMESTAMP(6),
ADD COLUMN     "payoutStatus" "ItemPayoutStatus" NOT NULL DEFAULT 'ESCROW';

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "pendingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "walletBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplierId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
