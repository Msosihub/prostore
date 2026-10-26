CREATE TABLE "OtpThrottle" (
  "identifier" TEXT PRIMARY KEY,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sendCount" INTEGER NOT NULL DEFAULT 0 CHECK ("sendCount" >= 0),
  "failedAttempts" INTEGER NOT NULL DEFAULT 0 CHECK ("failedAttempts" >= 0),
  "lastSentAt" TIMESTAMP(3)
);
