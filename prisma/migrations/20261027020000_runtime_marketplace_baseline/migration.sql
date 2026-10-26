-- Forward-only repair of omitted Prostore DDL. No historical facts are inferred.
-- Explicit transaction also protects Prisma migrate deploy (not just the test runner).
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE "User", "Order", "OrderItem", "Supplier", "PayoutRequest", "Message", "Conversation", "PaymentAttempt", "MoneyReviewCase", "OrderNotification", "Account", "Inquiry", "Quote", "Product" IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "OrderItem") THEN
    RAISE EXCEPTION 'RECONCILIATION_REQUIRED: OrderItem history exists without declared fulfillment baseline; reconcile per-item state before adoption';
  END IF;
  IF EXISTS (SELECT 1 FROM "Order" WHERE "isPaid" OR "paidAt" IS NOT NULL OR "isDelivered" OR "deliveredAt" IS NOT NULL OR "paymentStatus" <> 'PENDING')
     OR EXISTS (SELECT 1 FROM "Supplier" WHERE "pendingBalance" <> 0 OR "walletBalance" <> 0)
     OR EXISTS (SELECT 1 FROM "PayoutRequest")
     OR EXISTS (SELECT 1 FROM "PaymentAttempt") OR EXISTS (SELECT 1 FROM "MoneyReviewCase") OR EXISTS (SELECT 1 FROM "OrderNotification") THEN
    RAISE EXCEPTION 'RECONCILIATION_REQUIRED: financial history exists; verified ledger baseline required, no balances or history were changed';
  END IF;
  IF EXISTS (SELECT 1 FROM "Message") THEN
    RAISE EXCEPTION 'RECONCILIATION_REQUIRED: legacy Message history needs an authoritative updatedAt baseline; no timestamp backfill attempted';
  END IF;
  IF to_regclass('public."SupplierLedger"') IS NOT NULL OR to_regclass('public."ReturnRequest"') IS NOT NULL
     OR to_regclass('public."OrderItemEvent"') IS NOT NULL OR to_regclass('public."OrderDeliveryFeedback"') IS NOT NULL THEN
    RAISE EXCEPTION 'RECONCILIATION_REQUIRED: runtime tables already exist outside migration history; compare exact schema and adopt only after reviewed reconciliation';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname IN ('OrderItemStatus','ReturnRequestStatus'))
     OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND ((table_name='OrderItem' AND column_name IN ('status','dispatchNote','dispatchedAt','buyerDeliveryComment','buyerDeliveryRating','rejectedAt','rejectionReason')) OR (table_name='User' AND column_name IN ('chatwootAgentId','chatwootContactId')) OR (table_name='Message' AND column_name IN ('updatedAt','chatwootId','chatwootStatus','chatwootMessageId')) OR (table_name='Conversation' AND column_name IN ('chatwootContactId','chatwootConversationId','chatwootInboxId','chatwootLastMessageAt')))) THEN
    RAISE EXCEPTION 'RECONCILIATION_REQUIRED: partial out-of-band runtime DDL exists; compare and adopt reviewed schema without overwriting it';
  END IF;
  IF EXISTS (SELECT 1 FROM "Account" WHERE "createdAt" <> date_trunc('milliseconds',"createdAt"))
     OR EXISTS (SELECT 1 FROM "Conversation" WHERE "updatedAt" <> date_trunc('milliseconds',"updatedAt"))
     OR EXISTS (SELECT 1 FROM "Inquiry" WHERE "updatedAt" <> date_trunc('milliseconds',"updatedAt"))
     OR EXISTS (SELECT 1 FROM "Quote" WHERE "updatedAt" <> date_trunc('milliseconds',"updatedAt")) THEN
    RAISE EXCEPTION 'RECONCILIATION_REQUIRED: timestamp precision conversion would lose historical microseconds; no truncation performed';
  END IF;
  IF EXISTS (SELECT 1 FROM "Inquiry" WHERE "productId" IS NOT NULL AND "productId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RAISE EXCEPTION 'RECONCILIATION_REQUIRED: Inquiry has non-UUID product references; no reference was rewritten';
  END IF;
  IF EXISTS (SELECT 1 FROM "Inquiry" i WHERE i."productId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "Product" p WHERE p.id=i."productId"::uuid)) THEN
    RAISE EXCEPTION 'RECONCILIATION_REQUIRED: Inquiry has orphan product references; no inquiry was deleted';
  END IF;
END $$;
CREATE TYPE "OrderItemStatus" AS ENUM ('PAID','PREPARING','DISPATCHED','DELIVERED','REJECTED','RETURNED','CANCELLED');
CREATE TYPE "ReturnRequestStatus" AS ENUM ('REQUESTED','APPROVED','REJECTED','REFUNDED');
ALTER TABLE "User" ADD COLUMN "chatwootAgentId" INTEGER, ADD COLUMN "chatwootContactId" INTEGER;
ALTER TABLE "OrderItem"
 ADD COLUMN "status" "OrderItemStatus" NOT NULL DEFAULT 'PREPARING',
 ADD COLUMN "dispatchNote" TEXT,
 ADD COLUMN "dispatchedAt" TIMESTAMP(6),
 ADD COLUMN "buyerDeliveryComment" TEXT,
 ADD COLUMN "buyerDeliveryRating" INTEGER,
 ADD COLUMN "rejectedAt" TIMESTAMP(6),
 ADD COLUMN "rejectionReason" TEXT;
CREATE TABLE "SupplierLedger" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "supplierId" UUID NOT NULL, "orderId" UUID NOT NULL, "orderItemId" UUID,
 "type" TEXT NOT NULL, "amount" DECIMAL(12,2) NOT NULL, "status" TEXT NOT NULL, "reference" TEXT, "metadata" JSONB,
 "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SupplierLedger_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupplierLedger_reference_key" ON "SupplierLedger"("reference");
CREATE TABLE "OrderItemEvent" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "orderId" UUID NOT NULL, "productId" UUID NOT NULL, "actorId" UUID,
 "type" TEXT NOT NULL, "note" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OrderItemEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OrderDeliveryFeedback" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "orderId" UUID NOT NULL, "productId" UUID NOT NULL,
 "buyerId" UUID NOT NULL, "supplierId" UUID NOT NULL, "rating" INTEGER NOT NULL, "comment" TEXT,
 "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OrderDeliveryFeedback_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderDeliveryFeedback_orderId_productId_key" ON "OrderDeliveryFeedback"("orderId","productId");
CREATE TABLE "ReturnRequest" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "orderId" UUID NOT NULL, "productId" UUID NOT NULL,
 "buyerId" UUID NOT NULL, "supplierId" UUID NOT NULL, "reason" TEXT NOT NULL,
 "status" "ReturnRequestStatus" NOT NULL DEFAULT 'REQUESTED', "adminNote" TEXT,
 "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReturnRequest_orderId_productId_key" ON "ReturnRequest"("orderId","productId");
-- These models intentionally have no Prisma relations/FKs; match the existing contract.
ALTER TABLE "Message" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "chatwootId" INTEGER, ADD COLUMN "chatwootStatus" TEXT DEFAULT 'pending', ADD COLUMN "chatwootMessageId" INTEGER;
CREATE UNIQUE INDEX "Message_chatwootId_key" ON "Message"("chatwootId");
ALTER TABLE "Conversation" ADD COLUMN "chatwootContactId" INTEGER, ADD COLUMN "chatwootConversationId" INTEGER,
 ADD COLUMN "chatwootInboxId" INTEGER, ADD COLUMN "chatwootLastMessageAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Conversation_chatwootConversationId_key" ON "Conversation"("chatwootConversationId");
ALTER TABLE "Account" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3);
ALTER TABLE "Conversation" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3);
ALTER TABLE "Inquiry" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3), ALTER COLUMN "productId" TYPE UUID USING "productId"::uuid;
ALTER TABLE "Quote" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3);
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;
