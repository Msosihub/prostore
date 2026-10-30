import "server-only";
import { prisma } from "@/db/prisma";
import { requireAdmin } from "@/lib/auth-guard";

// Derived quarantine: no bulk backfill, payment call, stock change or clearance action.
// Cursor pagination is bounded; absent payment-attempt records cannot hide candidates.
export async function legacyReviewQueue(cursor?: string) {
  await requireAdmin();
  if (
    cursor &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cursor,
    )
  )
    throw new Error("Invalid review cursor");
  const items = await prisma.$queryRaw<
    Array<{ id: string; affectedItems: number; deliveredItems: number }>
  >`
    SELECT o.id, count(1)::int AS "affectedItems",
      count(1) FILTER (WHERE i."isDelivered")::int AS "deliveredItems"
    FROM "Order" o JOIN "OrderItem" i ON i."orderId"=o.id
    WHERE o."isPaid" AND (${cursor ?? null}::uuid IS NULL OR o.id > ${cursor ?? null}::uuid)
      AND NOT EXISTS (SELECT 1 FROM "SupplierLedger" l
        WHERE l.reference='ESCROW_CREDIT_'||o.id::text||'_'||i."productId"::text
          AND l."orderId"=o.id AND l."supplierId"::text=i."supplierId"
          AND l.type='ESCROW_CREDIT' AND l.status='COMPLETED'
          AND i.qty>0 AND i.price>0 AND i.price::text NOT IN ('NaN','Infinity','-Infinity')
          AND l.amount::text NOT IN ('NaN','Infinity','-Infinity') AND l.amount=i.price*i.qty)
    GROUP BY o.id ORDER BY o.id LIMIT 21`;
  return {
    items: items.slice(0, 20),
    next: items.length > 20 ? items[19].id : null,
  };
}
