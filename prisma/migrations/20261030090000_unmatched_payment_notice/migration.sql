-- No order FK: historical references may belong to a separately retained book.
CREATE TABLE "UnmatchedPaymentNotice" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL CHECK ("provider" = 'ZENOPAY'),
  "attemptReference" VARCHAR(150) NOT NULL,
  "claimedStatus" TEXT NOT NULL CHECK ("claimedStatus" IN ('PENDING','COMPLETED','FAILED','UNKNOWN')),
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "occurrences" INTEGER NOT NULL DEFAULT 1 CHECK ("occurrences" > 0)
);
CREATE INDEX "UnmatchedPaymentNotice_lastSeenAt_id_idx" ON "UnmatchedPaymentNotice" ("lastSeenAt", "id");
