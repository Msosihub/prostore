import Link from "next/link";
import { getAdminDisputes } from "@/lib/admin-operations";
import AdminPagination from "@/components/admin/pagination";
export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getAdminDisputes(await searchParams);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Disputes and returns</h1>
      <p>
        Oldest requests first. Open the order to review the disputed item and
        fulfillment history.
      </p>
      <p className="rounded-lg bg-amber-50 p-3 text-sm">
        This queue is read-only. Approval is not proof of a refund; this screen
        never moves money or releases escrow.
      </p>
      <form action="/admin/disputes" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          Request status
          <select
            name="status"
            defaultValue={data.filters.status || "open"}
            className="rounded border bg-white p-2"
          >
            <option value="open">Open requests</option>
            <option value="all">All requests</option>
            {["REQUESTED", "APPROVED", "REJECTED", "REFUNDED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="rounded bg-emerald-800 px-4 py-2 text-white">
          Apply filters
        </button>
      </form>
      {!data.items.length && (
        <p role="status" className="rounded-xl border bg-white p-6">
          No disputes match this status.
        </p>
      )}
      {data.items.map((item) => (
        <article
          key={item.id}
          className="space-y-2 rounded-xl border bg-white p-4"
        >
          <h2 className="font-semibold">
            Request #{item.id.slice(0, 8)} · {item.status}
          </h2>
          <p>
            Opened {item.createdAt.toISOString().slice(0, 10)} · Item #
            {item.productId.slice(0, 8)}
          </p>
          <Link className="underline" href={`/admin/orders/${item.orderId}`}>
            Review order #{item.orderId.slice(0, 8)}
          </Link>
        </article>
      ))}
      <AdminPagination path="/admin/disputes" {...data} />
    </section>
  );
}
