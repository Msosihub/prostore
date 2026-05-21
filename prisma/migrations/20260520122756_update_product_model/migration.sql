-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CUSTOMER', 'TECHNICIAN_CCTV', 'TECHNICIAN_CAR', 'SUPPLIER', 'UNKNOWN');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "deliveredAt" TIMESTAMP(6),
ADD COLUMN     "isDelivered" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "isVIP" BOOLEAN NOT NULL DEFAULT false,
    "type" "ContactType" NOT NULL DEFAULT 'UNKNOWN',
    "lastMessage" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contact_phone_key" ON "Contact"("phone");
