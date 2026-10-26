import Link from "next/link";
import { notFound } from "next/navigation";
import { paymentDetail } from "@/lib/admin-payment-recovery";
import PaymentRefresh from "@/components/admin/payment-refresh";
export default async function PaymentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const item = await paymentDetail((await params).id);
  if (!item) notFound();
  return (
    <section className="space-y-4">
      <Link href="/admin/payments" className="underline">
        Payment recovery queue
      </Link>
      <h1 className="text-2xl font-bold">Payment attempt</h1>
      <dl className="space-y-2 rounded border bg-white p-4 break-words">
        <dt>Order</dt>
        <dd>
          <Link className="underline" href={`/admin/orders/${item.orderId}`}>
            {item.orderId}
          </Link>
        </dd>
        <dt>Amount</dt>
        <dd>
          {item.currency} {String(item.amount)}
        </dd>
        <dt>Recovery state</dt>
        <dd>{item.state}</dd>
        <dt>Provider payment</dt>
        <dd>
          {item.verifiedAt
            ? `Verified ${item.verifiedAt.toISOString()}`
            : "Not verified"}
        </dd>
        <dt>Local order settlement</dt>
        <dd>
          {item.order.isPaid
            ? "Recorded paid; consult item ledger for legacy records"
            : "Not committed"}
        </dd>
        <dt>Provider order reference</dt>
        <dd>{item.providerOrderId}</dd>
      </dl>
      <p>
        Checking verifies provider status and retries the existing atomic
        settlement. Stock or legacy inconsistencies stay under review; no
        refund, stock adjustment or second collection is performed.
      </p>
      {item.legacyPaid && (
        <p role="status">
          Legacy paid record: automatic settlement is blocked. Reconcile stock
          and escrow separately.
        </p>
      )}
      <PaymentRefresh orderId={item.orderId} admin />
      <h2 className="text-xl font-semibold">Latest 50 events</h2>
      <ol className="space-y-2">
        {item.events.map((e) => (
          <li key={e.id} className="rounded border p-3">
            {e.createdAt.toISOString()} · {e.state} · {e.reason}
          </li>
        ))}
      </ol>
    </section>
  );
}
