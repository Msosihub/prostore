export const metadata = { robots: { index: false, follow: false } };
import Link from "next/link";
import { listChatReports } from "@/lib/market-chat";
export default async function ChatReports({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const p = await searchParams;
  const data = await listChatReports(p.before);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Chat reports</h1>
      <p>
        Participant reports only. No general access to private conversations.
        Review does not settle disputes or transfer funds.
      </p>
      <ul className="space-y-3">
        {data.items.map((r) => (
          <li key={r.id} className="rounded border bg-white p-4">
            <Link className="underline" href={`/admin/chat-reports/${r.id}`}>
              {r.reason} — {r.status}
            </Link>
            <p>{r.createdAt.toISOString()}</p>
          </li>
        ))}
      </ul>
      {!data.items.length && <p>No reports.</p>}
      <nav className="flex gap-4">
        <Link href="/admin/chat-reports">Latest reports</Link>
        {data.hasMore && (
          <Link href={`/admin/chat-reports?before=${data.items.at(-1)!.id}`}>
            Older reports
          </Link>
        )}
      </nav>
    </section>
  );
}
