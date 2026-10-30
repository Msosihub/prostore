CREATE TABLE "MoneyReviewCase" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "requestKey" uuid NOT NULL,
 "actorId" uuid NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "supplierId" uuid NOT NULL REFERENCES "Supplier"("id") ON DELETE RESTRICT,
 "kind" text NOT NULL CHECK ("kind" IN ('WITHDRAWAL','REFUND')),
 "state" text NOT NULL DEFAULT 'REQUESTED' CHECK ("state" IN ('REQUESTED','UNDER_REVIEW','APPROVED','REJECTED','CANCELLED')),
 "amount" numeric(12,2) NOT NULL CHECK ("amount" > 0),
 "orderId" uuid REFERENCES "Order"("id") ON DELETE RESTRICT, "productId" uuid,
 "quantity" integer, "paymentVerified" boolean NOT NULL DEFAULT false,
 "reason" text NOT NULL, "createdAt" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" timestamp(6) NOT NULL,
 CONSTRAINT "MoneyReviewCase_actorId_requestKey_key" UNIQUE ("actorId","requestKey"),
 CHECK (("kind" = 'WITHDRAWAL' AND "orderId" IS NULL AND "productId" IS NULL AND "quantity" IS NULL) OR ("kind" = 'REFUND' AND "orderId" IS NOT NULL AND "productId" IS NOT NULL AND "quantity" > 0)),
 CHECK ("kind" != 'REFUND' OR "state" != 'APPROVED')
);
CREATE INDEX "MoneyReviewCase_supplierId_state_idx" ON "MoneyReviewCase"("supplierId","state");
CREATE INDEX "MoneyReviewCase_orderId_productId_idx" ON "MoneyReviewCase"("orderId","productId");
CREATE TABLE "MoneyReviewEvent" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "caseId" uuid NOT NULL REFERENCES "MoneyReviewCase"("id") ON DELETE RESTRICT,
 "actorId" uuid NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "state" text NOT NULL, "reason" text NOT NULL,
 "createdAt" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MoneyReviewEvent_caseId_createdAt_idx" ON "MoneyReviewEvent"("caseId","createdAt");
