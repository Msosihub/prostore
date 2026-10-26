-- SELECT only. Run against an independently authorized snapshot/read replica in
-- a READ ONLY transaction. Results are review candidates, never repair advice.
-- No customer data, provider payloads, credential values or balances are emitted.
WITH item_audit AS (
  SELECT i.*, o."isPaid", o."paymentStatus",
         c.id AS credit_id, c."supplierId" AS credit_supplier,
         c."orderId" AS credit_order, c.amount AS credit_amount,
         c.type AS credit_type, c.status AS credit_status,
         r.id AS release_id, r."supplierId" AS release_supplier,
         r."orderId" AS release_order, r.amount AS release_amount,
         r.type AS release_type, r.status AS release_status
  FROM "OrderItem" i
  JOIN "Order" o ON o.id = i."orderId"
  LEFT JOIN "SupplierLedger" c
    ON c.reference = 'ESCROW_CREDIT_' || i."orderId"::text || '_' || i."productId"::text
  LEFT JOIN "SupplierLedger" r
    ON r.reference = 'ESCROW_RELEASE_' || i."orderId"::text || '_' || i."productId"::text
), findings AS (
  SELECT 'PAID_WITHOUT_ITEMS' AS code, 'order' AS scope, o.id::text AS record_id
  FROM "Order" o WHERE o."isPaid" AND NOT EXISTS (
    SELECT 1 FROM "OrderItem" i WHERE i."orderId" = o.id)
  UNION ALL
  SELECT 'PAID_STATUS_MISMATCH', 'order', id::text FROM "Order"
  WHERE "isPaid" AND "paymentStatus" IS DISTINCT FROM 'COMPLETED'
  UNION ALL
  SELECT 'UNBOUND_PENDING_PAYMENT_REVIEW', 'order', id::text FROM "Order"
  WHERE NOT "isPaid" AND "paymentMethod" = 'ZENOPAY' AND "paymentStatus" = 'PENDING'
    AND (json_typeof("paymentResult"->'zenopay_order_id') IS DISTINCT FROM 'string'
         OR COALESCE(length(trim("paymentResult"->>'zenopay_order_id')), 0) = 0)
  UNION ALL
  SELECT 'INVALID_ITEM_VALUE', 'order', "orderId"::text FROM item_audit
  WHERE qty < 1 OR price <= 0 OR COALESCE(length(trim("supplierId")), 0) = 0
  UNION ALL
  SELECT 'PAID_CREDIT_MISSING_OR_INCONSISTENT', 'order', "orderId"::text FROM item_audit
  WHERE "isPaid" AND (credit_id IS NULL OR credit_supplier::text IS DISTINCT FROM "supplierId"
    OR credit_order IS DISTINCT FROM "orderId" OR credit_amount IS DISTINCT FROM price * qty
    OR credit_type IS DISTINCT FROM 'ESCROW_CREDIT' OR credit_status IS DISTINCT FROM 'COMPLETED')
  UNION ALL
  SELECT 'UNPAID_CREDIT_PRESENT', 'order', "orderId"::text FROM item_audit
  WHERE NOT "isPaid" AND credit_id IS NOT NULL
  UNION ALL
  SELECT 'DELIVERED_RELEASE_MISSING_OR_INCONSISTENT', 'order', "orderId"::text FROM item_audit
  WHERE "isDelivered" AND (release_id IS NULL OR release_supplier::text IS DISTINCT FROM "supplierId"
    OR release_order IS DISTINCT FROM "orderId" OR release_amount IS DISTINCT FROM price * qty
    OR release_type IS DISTINCT FROM 'ESCROW_RELEASE' OR release_status IS DISTINCT FROM 'COMPLETED'
    OR "payoutStatus" IS DISTINCT FROM 'PAID' OR status IS DISTINCT FROM 'DELIVERED')
  UNION ALL
  SELECT 'RELEASE_WITHOUT_DELIVERY', 'order', "orderId"::text FROM item_audit
  WHERE NOT "isDelivered" AND release_id IS NOT NULL
  UNION ALL
  SELECT 'PARENT_DELIVERY_MISMATCH', 'order', o.id::text FROM "Order" o
  WHERE EXISTS (SELECT 1 FROM "OrderItem" i WHERE i."orderId" = o.id)
    AND o."isDelivered" IS DISTINCT FROM NOT EXISTS (
      SELECT 1 FROM "OrderItem" i WHERE i."orderId" = o.id AND NOT i."isDelivered")
  UNION ALL
  SELECT 'DISPUTE_WITH_RELEASE_REVIEW', 'order', i."orderId"::text FROM item_audit i
  JOIN "ReturnRequest" d ON d."orderId" = i."orderId" AND d."productId" = i."productId"
  WHERE d.status <> 'REJECTED' AND i.release_id IS NOT NULL
  UNION ALL
  SELECT 'NEGATIVE_SUPPLIER_BALANCE', 'supplier', id::text FROM "Supplier"
  WHERE "pendingBalance" < 0 OR "walletBalance" < 0
  UNION ALL
  SELECT 'SUPPLIER_BALANCE_REQUIRES_HISTORY', 'supplier', s.id::text FROM "Supplier" s
  WHERE EXISTS (SELECT 1 FROM "SupplierLedger" l WHERE l."supplierId" = s.id
                AND (l.type NOT IN ('ESCROW_CREDIT', 'ESCROW_RELEASE') OR l.status <> 'COMPLETED'))
     OR s."pendingBalance" IS DISTINCT FROM COALESCE((
       SELECT sum(CASE WHEN l.type = 'ESCROW_CREDIT' THEN l.amount ELSE -l.amount END)
       FROM "SupplierLedger" l WHERE l."supplierId" = s.id AND l.status = 'COMPLETED'
         AND l.type IN ('ESCROW_CREDIT', 'ESCROW_RELEASE')), 0)
)
SELECT DISTINCT code, scope, record_id FROM findings ORDER BY scope, record_id, code;
