-- Additive only: legacy Conversation/Message/Inquiry/Quote remain unchanged.
CREATE TABLE "MarketThread" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 "buyerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "supplierId" UUID NOT NULL REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "productId" UUID NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(6) NOT NULL,
 CONSTRAINT "MarketThread_buyerId_supplierId_productId_key" UNIQUE ("buyerId","supplierId","productId")
);
CREATE INDEX "MarketThread_buyerId_updatedAt_idx" ON "MarketThread"("buyerId","updatedAt");
CREATE INDEX "MarketThread_supplierId_updatedAt_idx" ON "MarketThread"("supplierId","updatedAt");
CREATE TABLE "MarketMessage" (
 "id" UUID PRIMARY KEY,
 "threadId" UUID NOT NULL REFERENCES "MarketThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "senderId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "content" TEXT NOT NULL CHECK (char_length("content") BETWEEN 1 AND 2000),
 "seen" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MarketMessage_threadId_createdAt_id_idx" ON "MarketMessage"("threadId","createdAt","id");
CREATE TABLE "MarketProposal" (
 "id" UUID PRIMARY KEY,
 "threadId" UUID NOT NULL REFERENCES "MarketThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
 "snapshot" JSONB NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','CANCELLED','ACCEPTED')),
 "orderId" UUID UNIQUE REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (("status" = 'ACCEPTED') = ("orderId" IS NOT NULL))
);
CREATE INDEX "MarketProposal_threadId_createdAt_idx" ON "MarketProposal"("threadId","createdAt");
