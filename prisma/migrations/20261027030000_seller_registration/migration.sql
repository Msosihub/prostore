CREATE TABLE "SellerRegistration" (
 "id" UUID NOT NULL PRIMARY KEY, "supplierId" UUID NOT NULL REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "state" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("state" IN ('PENDING','APPROVED','REJECTED')),
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0), "smsConsent" BOOLEAN NOT NULL DEFAULT false,
 "phoneDigest" TEXT NOT NULL, "reviewReason" TEXT, "reviewedBy" UUID, "reviewedAt" TIMESTAMP(6), "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SellerRegistration_supplierId_key" ON "SellerRegistration"("supplierId");
CREATE INDEX "SellerRegistration_state_createdAt_idx" ON "SellerRegistration"("state","createdAt");
CREATE TABLE "SellerNotice" (
 "id" UUID NOT NULL PRIMARY KEY, "eventKey" TEXT NOT NULL, "registrationId" UUID NOT NULL REFERENCES "SellerRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('RECEIVED','APPROVED','REJECTED')), "version" INTEGER NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'QUEUED', "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "leaseToken" TEXT, "leaseUntil" TIMESTAMP(6), "reason" TEXT, "providerMessageId" TEXT,
 "acceptedAt" TIMESTAMP(6), "completedAt" TIMESTAMP(6), "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SellerNotice_eventKey_key" ON "SellerNotice"("eventKey");
CREATE INDEX "SellerNotice_state_nextAttemptAt_idx" ON "SellerNotice"("state","nextAttemptAt");
CREATE TABLE "SellerNoticeEvent" (
 "id" UUID NOT NULL PRIMARY KEY, "notificationId" UUID NOT NULL REFERENCES "SellerNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "state" TEXT NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SellerNoticeEvent_notificationId_createdAt_idx" ON "SellerNoticeEvent"("notificationId","createdAt");
