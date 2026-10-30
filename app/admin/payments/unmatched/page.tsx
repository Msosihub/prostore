import Link from "next/link";
import { unmatchedPaymentNotices } from "@/lib/unmatched-payment-notice";
export const dynamic = "force-dynamic";
export default async function Unmatched({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await unmatchedPaymentNotices((await searchParams).page);
  return (
    <section className="space-y-4">
      <Link href="/admin/payments" className="underline">
        Payment recovery
      </Link>
      <h1 className="text-2xl font-bold">Unmatched callback evidence</h1>
      <p>
        Authenticated notifications with no matching local attempt. Claimed
        status is unverified. Nothing here has been settled, forwarded or marked
        processed.
      </p>
      <p>
        Compare each reference privately with the retained historical book and
        provider records. Do not replay settlement, create an order or change
        balances from this notice. Reference ownership and verified provider
        evidence are required before any separately approved resolution.
      </p>
      {!data.items.length && (
        <p role="status">No unmatched notifications on this page.</p>
      )}
      <ul className="space-y-3">
        {data.items.map((item) => (
          <li key={item.id} className="rounded border p-4 break-all">
            <h2 className="font-semibold">{item.attemptReference}</h2>
            <p>
              Unverified claim: {item.claimedStatus} · Observed{" "}
              {item.occurrences} times
            </p>
            <p>First seen: {item.firstSeenAt.toISOString()}</p>
            <p>Last seen: {item.lastSeenAt.toISOString()}</p>
          </li>
        ))}
      </ul>
      <nav aria-label="Unmatched notifications pages" className="flex gap-4">
        {data.page > 1 && (
          <Link className="underline" href={`?page=${data.page - 1}`}>
            Previous
          </Link>
        )}
        <span>Page {data.page}</span>
        {data.hasNext && (
          <Link className="underline" href={`?page=${data.page + 1}`}>
            Next
          </Link>
        )}
      </nav>
    </section>
  );
}
