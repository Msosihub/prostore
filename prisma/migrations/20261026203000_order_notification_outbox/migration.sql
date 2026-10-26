ALTER TABLE "User" ADD COLUMN "orderSmsEnabled" BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE "OrderNotification" (
 "id" UUID PRIMARY KEY, "eventKey" TEXT NOT NULL UNIQUE, "orderId" UUID NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('BUYER_PAYMENT','SELLER_PAYMENT','SELLER_DELIVERY','BUYER_DISPATCH','BUYER_REMINDER')),
 "targetId" TEXT NOT NULL, "productId" UUID,
 "state" TEXT NOT NULL DEFAULT 'QUEUED' CHECK ("state" IN ('QUEUED','SENDING','RETRY','ACCEPTED','FAILED','UNKNOWN','SUPPRESSED')),
 "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" BETWEEN 0 AND 5),
 "nextAttemptAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "leaseToken" TEXT, "leaseUntil" TIMESTAMP(6),
 "reason" TEXT, "providerMessageId" TEXT, "acceptedAt" TIMESTAMP(6), "completedAt" TIMESTAMP(6),
 "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "OrderNotification_state_nextAttemptAt_idx" ON "OrderNotification"("state", "nextAttemptAt");
CREATE TABLE "OrderNotificationEvent" (
 "id" UUID PRIMARY KEY, "notificationId" UUID NOT NULL REFERENCES "OrderNotification"("id") ON DELETE CASCADE,
 "actorId" UUID, "state" TEXT NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "OrderNotificationEvent_notificationId_createdAt_idx" ON "OrderNotificationEvent"("notificationId", "createdAt");
