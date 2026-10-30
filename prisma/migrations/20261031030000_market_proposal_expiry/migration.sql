-- Existing proposals retain their original non-expiring behavior. No history rewrite.
ALTER TABLE "MarketProposal" ADD COLUMN "expiresAt" TIMESTAMP(6);
