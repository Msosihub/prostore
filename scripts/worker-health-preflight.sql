-- READ ONLY: run only on an independently authorized staging database after migrations.
-- Aggregate operational evidence only. No recipients, payloads, credentials or external calls.
BEGIN TRANSACTION READ ONLY;
SELECT 'notifications' AS queue, "state", count(*) AS count,
 count(*) FILTER (WHERE "nextAttemptAt" <= CURRENT_TIMESTAMP) AS due,
 count(*) FILTER (WHERE "state"='SENDING' AND "leaseUntil" < CURRENT_TIMESTAMP) AS expired_leases,
 min("createdAt") AS oldest_created_at, max("acceptedAt") AS latest_provider_acceptance
FROM "OrderNotification" GROUP BY "state" ORDER BY "state";
SELECT 'payments' AS queue, "state", count(*) AS count,
 count(*) FILTER (WHERE "nextCheckAt" <= CURRENT_TIMESTAMP) AS due,
 count(*) FILTER (WHERE "leaseUntil" < CURRENT_TIMESTAMP) AS expired_leases,
 min("createdAt") AS oldest_created_at, max("verifiedAt") AS latest_verified_at
FROM "PaymentAttempt" GROUP BY "state" ORDER BY "state";
-- Queue observations alone cannot prove a scheduler is running or a provider accepted delivery.
ROLLBACK;
