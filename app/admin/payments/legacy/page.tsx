import Link from "next/link";
import { legacyReviewQueue } from "@/lib/admin-legacy-review";
export default async function LegacyReview({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const data = await legacyReviewQueue((await searchParams).cursor);
  return (
    <section className="space-y-4">
      <Link className="underline" href="/admin/payments">
        Back to payment recovery
      </Link>
      <h1 className="text-2xl font-bold">Legacy escrow review</h1>
      <p>
        Recorded-paid orders with missing or inconsistent item credits. This is
        a read-only review queue, not proof of missing money or verified
        provider payment.
      </p>
      <p>
        Do not recharge, replay settlement or create replacement credits.
        Compare receipts, stock history, seller balances and returns privately.
        Unrelated orders continue through their normal checkout.
      </p>
      <p>
        Delivery release requires a matching completed credit. Already-delivered
        records are preserved. Review has no automatic clearance or transfer
        action.
      </p>
      {!data.items.length && (
        <p role="status">
          No candidates on this page. This does not certify all historical
          payments or balances.
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {data.items.map((item) => (
          <li key={item.id} className="rounded border p-4 break-words">
            <Link className="underline" href={`/admin/orders/${item.id}`}>
              Review order {item.id}
            </Link>
            <p>
              {item.affectedItems} affected items; {item.deliveredItems} already
              marked delivered.
            </p>
          </li>
        ))}
      </ul>
      {data.next && (
        <Link
          className="inline-block underline"
          href={`/admin/payments/legacy?cursor=${data.next}`}
        >
          Next review page
        </Link>
      )}
    </section>
  );
}
