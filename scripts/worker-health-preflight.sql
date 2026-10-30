-- READ ONLY: run only on an independently authorized staging database after migrations.
-- Aggregate operational evidence only. No recipients, payloads, credentials or external calls.
BEGIN TRANSACTION READ ONLY;
SELECT 'notifications' AS queue, "state", count(*) AS count,
 count(*) FILTER (WHERE
   ("state" IN ('QUEUED','RETRY') AND "attempts" < 5 AND "nextAttemptAt" <= CURRENT_TIMESTAMP)
   OR ("state"='SENDING' AND "leaseUntil" <= CURRENT_TIMESTAMP)) AS due_candidates,
 count(*) FILTER (WHERE "state"='SENDING' AND "leaseUntil" <= CURRENT_TIMESTAMP) AS expired_leases,
 min("createdAt") AS oldest_created_at, max("acceptedAt") AS latest_provider_acceptance
FROM "OrderNotification" GROUP BY "state" ORDER BY "state";
SELECT 'seller_notices' AS queue, "state", count(*) AS count,
 count(*) FILTER (WHERE
   ("state" IN ('QUEUED','RETRY') AND "attempts" < 5 AND "nextAttemptAt" <= CURRENT_TIMESTAMP)
   OR ("state"='SENDING' AND "leaseUntil" <= CURRENT_TIMESTAMP)) AS due_candidates,
 count(*) FILTER (WHERE "state"='SENDING' AND "leaseUntil" <= CURRENT_TIMESTAMP) AS expired_leases,
 min("createdAt") AS oldest_created_at, max("acceptedAt") AS latest_provider_acceptance
FROM "SellerNotice" GROUP BY "state" ORDER BY "state";
SELECT 'payments' AS queue, "state", count(*) AS count,
 count(*) FILTER (WHERE "state" != 'SETTLED' AND "nextCheckAt" <= CURRENT_TIMESTAMP) AS due_candidates,
 count(*) FILTER (WHERE "leaseUntil" <= CURRENT_TIMESTAMP) AS expired_leases,
 min("createdAt") AS oldest_created_at, max("verifiedAt") AS latest_verified_at
FROM "PaymentAttempt" GROUP BY "state" ORDER BY "state";
-- due_candidates mirrors batch selection, not a promise of sends/settlement; expired SMS leases become UNKNOWN.
-- Retry cap5 matches MAX_NOTIFICATION_ATTEMPTS.
-- Queue observations alone cannot prove a scheduler is running or a provider accepted delivery.
ROLLBACK;
