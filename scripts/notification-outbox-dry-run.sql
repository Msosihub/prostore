-- No connection defaults, recipients, message bodies, writes or external calls.
BEGIN TRANSACTION READ ONLY;
SELECT "id", "orderId", "kind", "state", "attempts", "reason", "nextAttemptAt", "leaseUntil"
FROM "OrderNotification"
WHERE "state" IN ('QUEUED','RETRY','SENDING','UNKNOWN','FAILED')
ORDER BY "nextAttemptAt", "id" LIMIT 50;
ROLLBACK;
