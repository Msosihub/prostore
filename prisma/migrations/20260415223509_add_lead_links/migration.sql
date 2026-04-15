-- CreateTable
CREATE TABLE "LeadLink" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "leadName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadLink_pkey" PRIMARY KEY ("id")
);
