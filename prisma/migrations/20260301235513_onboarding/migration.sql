/*
  Warnings:

  - You are about to drop the `Otp` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PhoneVerification` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboarded" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Otp";

-- DropTable
DROP TABLE "PhoneVerification";
