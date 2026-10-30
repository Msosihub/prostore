import Link from "next/link";
import { getAdminOrders } from "@/lib/admin-operations";
import AdminPagination from "@/components/admin/pagination";
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getAdminOrders(await searchParams);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Orders and fulfillment</h1>
      <p>
        Payment confirmation does not mean delivery. Review each seller’s items
        inside an order.
      </p>
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"
        action="/admin/orders"
      >
        <label className="flex flex-col gap-1">
          Product name or full order ID
          <input
            name="q"
            maxLength={100}
            defaultValue={data.filters.q}
            className="rounded border p-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Payment / fulfillment
          <select
            name="status"
            defaultValue={data.filters.status}
            className="rounded border p-2"
          >
            <option value="">All orders</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Not settled</option>
            <option value="fulfillment">Paid, items unconfirmed</option>
          </select>
        </label>
        <button className="rounded bg-emerald-800 px-4 py-2 text-white">
          Apply filters
        </button>
        <Link href="/admin/orders" className="p-2 underline">
          Clear
        </Link>
      </form>
      {!data.items.length && (
        <p role="status" className="rounded-xl border bg-white p-6">
          No orders match these filters.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {data.items.map((order) => (
          <article
            key={order.id}
            className="space-y-2 rounded-xl border bg-white p-4"
          >
            <Link
              href={`/admin/orders/${order.id}`}
              className="font-semibold underline"
            >
              Order #{order.id.slice(0, 8)}
            </Link>
            <p>
              {order.createdAt.toISOString().slice(0, 10)} · TZS{" "}
              {String(order.totalPrice)}
            </p>
            <p>
              Payment: {order.isPaid ? "Recorded paid" : "Not settled — see payment recovery"} ·{" "}
              {order.paymentMethod}
            </p>
            <p>
              Confirmed received:{" "}
              {order.orderitems.filter((i) => i.isDelivered).length}/
              {order.orderitems.length} items ·{" "}
              {new Set(order.orderitems.map((i) => i.supplierId)).size} sellers
            </p>
          </article>
        ))}
      </div>
      <AdminPagination path="/admin/orders" {...data} />
    </section>
  );
}
