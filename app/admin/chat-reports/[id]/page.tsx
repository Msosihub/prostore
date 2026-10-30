export const metadata = { robots: { index: false, follow: false } };
import { notFound } from "next/navigation";
import { readChatReport } from "@/lib/market-chat";
import ReportReview from "@/components/market-chat/report-review";
export default async function ChatReport({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await readChatReport(id);
  if (!report) notFound();
  const evidence = Array.isArray(report.evidence) ? report.evidence : [];
  return (
    <section className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Chat report review</h1>
      <p>
        {report.reason} — {report.status}
      </p>
      <dl className="break-all text-sm">
        <dt>Reporter account reference</dt>
        <dd>{report.reporterId}</dd>
        <dt>Conversation reference</dt>
        <dd>{report.threadId}</dd>
      </dl>
      <p>
        Snapshot of up to 10 messages at reporting time. It may include disputed
        contact text. Do not share outside authorized case handling.
      </p>
      <ol className="space-y-3">
        {evidence.map((raw, i) => {
          const m = raw as {
            senderId?: unknown;
            content?: unknown;
            createdAt?: unknown;
          };
          return (
            <li key={i} className="border rounded bg-white p-3">
              <p className="font-semibold">
                {m.senderId === report.reporterId
                  ? "Reporter"
                  : "Other participant"}
              </p>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {typeof m.content === "string" ? m.content : ""}
              </p>
              <p>{typeof m.createdAt === "string" ? m.createdAt : ""}</p>
            </li>
          );
        })}
      </ol>
      <h2 className="font-bold">Review history</h2>
      <ul>
        {report.events.map((e, i) => (
          <li key={i}>
            {e.decision} — {e.createdAt.toISOString()}
          </li>
        ))}
      </ul>
      {report.status === "OPEN" ? (
        <ReportReview id={id} />
      ) : (
        <p>
          Review recorded. Follow-up, if needed, is an operator responsibility;
          no account action was automated.
        </p>
      )}
    </section>
  );
}
