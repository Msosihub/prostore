import Link from "next/link";
import { getAdminOverview } from "@/lib/admin-operations";
const money = (value: string) =>
  new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS" }).format(
    Number(value),
  );
export default async function AdminDashboardPage() {
  const data = await getAdminOverview();
  const queues = [
    [
      "Orders not settled",
      data.unpaid,
      "/admin/orders?status=unpaid",
      "Local settlement is incomplete. Includes pending, failed and provider-paid orders requiring review.",
    ],
    [
      "Open disputes",
      data.openDisputes,
      "/admin/disputes",
      "Requested or approved returns, oldest first.",
    ],
    [
      "Documents awaiting review",
      data.pendingDocuments,
      "/admin/documents",
      "Not verified and not rejected.",
    ],
    [
      "Unverified sellers",
      data.unverified,
      "/admin/suppliers?isVerified=false",
      "Verification is separate from document approval.",
    ],
  ] as const;
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operations overview</h1>
        <p className="mt-2 text-slate-600">
          Current platform records. Payment, fulfillment and seller balances are
          separate facts.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {queues.map(([label, value, href, description]) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border bg-white p-5 hover:border-emerald-700"
          >
            <h2 className="font-medium">{label}</h2>
            <p className="my-2 text-3xl font-bold">{value}</p>
            <p className="text-sm text-slate-600">{description}</p>
            <span className="mt-3 inline-block text-sm underline">
              Open queue
            </span>
          </Link>
        ))}
      </div>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-lg font-semibold">
          Payment and seller balance snapshot
        </h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-3">
          <div>
            <dt>Recorded paid order value</dt>
            <dd className="text-2xl font-bold">{money(data.paidTotal)}</dd>
            <p className="text-sm text-slate-600">
              {data.paidOrders} paid orders, including shipping. Not net revenue
              or a refund-adjusted settlement report.
            </p>
          </div>
          <div>
            <dt>Seller escrow balances</dt>
            <dd className="text-2xl font-bold">{money(data.pendingBalance)}</dd>
            <p className="text-sm text-slate-600">
              Current held balances, not realized seller revenue.
            </p>
          </div>
          <div>
            <dt>Seller wallet balances</dt>
            <dd className="text-2xl font-bold">{money(data.walletBalance)}</dd>
            <p className="text-sm text-slate-600">
              Current available balances, not cumulative sales or platform
              profit.
            </p>
          </div>
        </dl>
      </section>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Marketplace records</h2>
        <p className="mt-2">
          {data.orders} orders · {data.suppliers} sellers · {data.products}{" "}
          products
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link className="underline" href="/admin/orders?status=fulfillment">
            Paid orders with unconfirmed items
          </Link>
          <Link className="underline" href="/admin/audit-logs">
            Review administrative audit history
          </Link>
        </div>
      </section>
    </section>
  );
}
