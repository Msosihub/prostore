CREATE TABLE "PaymentAttempt" (
 "id" UUID PRIMARY KEY, "orderId" UUID NOT NULL UNIQUE REFERENCES "Order"("id") ON DELETE RESTRICT,
 "provider" TEXT NOT NULL DEFAULT 'ZENOPAY', "providerOrderId" TEXT NOT NULL UNIQUE,
 "amount" DECIMAL(12,2) NOT NULL CHECK ("amount" > 0), "currency" TEXT NOT NULL DEFAULT 'TZS' CHECK ("currency" = 'TZS'),
 "state" TEXT NOT NULL DEFAULT 'AMBIGUOUS' CHECK ("state" IN ('AMBIGUOUS','PENDING','FAILED','VERIFIED','REVIEW','SETTLED')),
 "legacyPaid" BOOLEAN NOT NULL DEFAULT false, "providerReference" TEXT, "verifiedAt" TIMESTAMP(6), "nextCheckAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "leaseToken" TEXT, "leaseUntil" TIMESTAMP(6), "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("provider", "providerReference")
);
CREATE INDEX "PaymentAttempt_state_nextCheckAt_idx" ON "PaymentAttempt"("state", "nextCheckAt");
CREATE TABLE "PaymentAttemptEvent" (
 "id" UUID PRIMARY KEY, "attemptId" UUID NOT NULL REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT,
 "state" TEXT NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PaymentAttemptEvent_attemptId_createdAt_idx" ON "PaymentAttemptEvent"("attemptId", "createdAt");
