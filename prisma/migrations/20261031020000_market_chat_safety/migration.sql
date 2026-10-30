CREATE TABLE "MarketBlock" (
 "threadId" UUID NOT NULL REFERENCES "MarketThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "blocked" BOOLEAN NOT NULL DEFAULT true, "updatedAt" TIMESTAMP(6) NOT NULL,
 PRIMARY KEY ("threadId","userId")
);
CREATE TABLE "MarketReport" (
 "id" UUID PRIMARY KEY, "threadId" UUID NOT NULL REFERENCES "MarketThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "reporterId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "reason" TEXT NOT NULL CHECK ("reason" IN ('CONTACT','HARASSMENT','PAYMENT','OTHER')),
 "evidence" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','REVIEWED')),
 "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MarketReport_threadId_reporterId_status_idx" ON "MarketReport"("threadId","reporterId","status");
CREATE INDEX "MarketReport_status_createdAt_id_idx" ON "MarketReport"("status","createdAt","id");
CREATE INDEX "MarketReport_reporterId_createdAt_idx" ON "MarketReport"("reporterId","createdAt");
CREATE TABLE "MarketReportEvent" (
 "id" UUID PRIMARY KEY, "reportId" UUID NOT NULL REFERENCES "MarketReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "actorId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "decision" TEXT NOT NULL CHECK ("decision" IN ('FOLLOW_UP','NO_ACTION')),
 "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
