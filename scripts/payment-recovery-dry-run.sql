-- Operator preview only. Run with psql against an explicitly approved database.
-- No connection defaults, network provider requests, writes, or schedule.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT "orderId", "state", "amount", "currency", "verifiedAt", "nextCheckAt",
       "legacyPaid", "leaseUntil"
FROM "PaymentAttempt"
WHERE "state" <> 'SETTLED'
ORDER BY "nextCheckAt", "id"
LIMIT 50;
SELECT o."id", o."isPaid", o."paymentStatus",
       CASE WHEN o."isPaid" THEN 'REVIEW_INVENTORY_AND_ESCROW' ELSE 'REVIEW_EXISTING_REFERENCE_NO_RECHARGE' END AS action
FROM "Order" o
WHERE o."paymentMethod" = 'ZENOPAY'
AND NOT EXISTS (SELECT 1 FROM "PaymentAttempt" a WHERE a."orderId" = o."id")
ORDER BY o."createdAt" LIMIT 50;
ROLLBACK;
