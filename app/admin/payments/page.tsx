import Link from "next/link";
import { paymentQueue } from "@/lib/admin-payment-recovery";
import AdminPagination from "@/components/admin/pagination";
export default async function Payments({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await paymentQueue(await searchParams);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Payment recovery</h1>
      <Link className="underline" href="/admin/payments/legacy">
        Legacy escrow review queue
      </Link>
      <Link className="block underline" href="/admin/payments/unmatched">
        Unmatched callback evidence
      </Link>
      <p>
        Provider confirmation and inventory / escrow settlement are separate.
        Review never means refunded. No automatic recharge or refund is
        available.
      </p>
      <form className="flex flex-wrap gap-3">
        <label>
          Order UUID
          <input
            name="q"
            defaultValue={data.filters.q}
            className="block rounded border p-2"
          />
        </label>
        <label>
          State
          <select
            name="status"
            defaultValue={data.filters.status}
            className="block rounded border p-2"
          >
            <option value="">Needs attention</option>
            {[
              "AMBIGUOUS",
              "PENDING",
              "FAILED",
              "VERIFIED",
              "REVIEW",
              "SETTLED",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="rounded border p-2">Apply filters</button>
      </form>
      <p>
        {data.total} matching attempts. {data.legacy} older ZenoPay orders have
        no durable record; use the order page and read-only reconciliation
        report before taking action.
      </p>
      {!data.items.length && <p role="status">No matching attempts.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {data.items.map((a) => (
          <Link
            className="rounded border bg-white p-4 break-words"
            key={a.id}
            href={`/admin/payments/${a.id}`}
          >
            <p>Order #{a.orderId.slice(0, 8)}</p>
            <p>
              {a.currency} {String(a.amount)} · {a.state}
            </p>
            <p>
              {a.verifiedAt
                ? "Provider payment verified"
                : "Payment not verified"}
            </p>
          </Link>
        ))}
      </div>
      {data.legacyItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            Latest legacy review candidates
          </h2>
          <p>
            Up to 20 orders without a durable attempt. Recorded paid does not
            prove legacy stock and escrow are consistent. Use the read-only
            report for the full audit.
          </p>
          <ul className="space-y-2">
            {data.legacyItems.map((order) => (
              <li key={order.id}>
                <Link className="underline" href={`/admin/orders/${order.id}`}>
                  Order #{order.id.slice(0, 8)}
                </Link>{" "}
                ·{" "}
                {order.isPaid
                  ? "Recorded paid — inventory audit required"
                  : "Unverified payment — do not recharge"}
              </li>
            ))}
          </ul>
        </section>
      )}
      <AdminPagination
        page={data.filters.page}
        total={data.total}
        pages={Math.max(1, Math.ceil(data.total / 20))}
        path="/admin/payments"
        filters={{ q: data.filters.q, status: data.filters.status }}
      />
    </section>
  );
}
