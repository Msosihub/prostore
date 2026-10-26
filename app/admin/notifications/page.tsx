import Link from "next/link";
import { notificationQueue } from "@/lib/admin-notifications";
import AdminPagination from "@/components/admin/pagination";
import NotificationRetry from "@/components/admin/notification-retry";
export default async function Notifications({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await notificationQueue(await searchParams);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Order notification outbox</h1>
      <p>
        Queued is not sent. Provider accepted is not delivered. Unknown outcomes
        require review because retrying can duplicate an SMS. No background
        worker is enabled by this code change.
      </p>
      <form className="flex flex-wrap gap-3">
        <label>
          Order UUID
          <input
            className="block rounded border p-2"
            name="q"
            defaultValue={data.filters.q}
          />
        </label>
        <label>
          Notification state
          <select
            className="block rounded border p-2"
            name="status"
            defaultValue={data.filters.status}
          >
            <option value="">All states</option>
            {[
              "QUEUED",
              "SENDING",
              "RETRY",
              "ACCEPTED",
              "FAILED",
              "UNKNOWN",
              "SUPPRESSED",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="rounded border p-2">Apply filters</button>
      </form>
      {!data.items.length && <p role="status">No matching notifications.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {data.items.map((row) => (
          <article
            key={row.id}
            className="space-y-2 rounded border bg-white p-4 break-words"
          >
            <Link className="underline" href={`/admin/orders/${row.orderId}`}>
              Order #{row.orderId.slice(0, 8)}
            </Link>
            <p>{row.kind}</p>
            <p>
              {row.state === "ACCEPTED"
                ? "Provider accepted (delivery unverified)"
                : row.state}{" "}
              · Attempts {row.attempts}/5
            </p>
            <p>{row.reason}</p>
            {["FAILED", "UNKNOWN"].includes(row.state) && row.attempts < 5 && (
              <NotificationRetry
                id={row.id}
                unknown={row.state === "UNKNOWN"}
              />
            )}
            <details>
              <summary>Recent status history</summary>
              <ul>
                {row.events.map((event, i) => (
                  <li key={i}>
                    {event.createdAt.toISOString()} · {event.state} ·{" "}
                    {event.reason}
                  </li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
      <AdminPagination
        path="/admin/notifications"
        page={data.filters.page}
        pages={Math.max(1, Math.ceil(data.total / 20))}
        total={data.total}
        filters={data.filters}
      />
    </section>
  );
}
