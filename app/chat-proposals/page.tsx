import Link from "next/link";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { proposalHistory, safeChat } from "@/lib/market-chat";
export const metadata = {
  title: "Historia ya mapendekezo",
  robots: { index: false, follow: false },
};
export default async function ProposalHistory({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; before?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const params = await searchParams;
  if (typeof params.thread !== "string") notFound();
  const result = await safeChat(() =>
    proposalHistory(params.thread!, params.before),
  );
  if (!result.ok) notFound();
  const data = result.data;
  const inbox = data.isSeller
    ? "/supplier/marketplace-chat"
    : "/buyer/messages";
  return (
    <main className="mx-auto max-w-3xl p-4 space-y-4 pb-24">
      <h1 className="text-2xl font-bold">Historia ya mapendekezo</h1>
      <p>
        Historia ni ya kusoma. Hakiki bei na ukubali pendekezo kwenye
        mazungumzo; hali ya malipo ipo kwenye agizo.
      </p>
      <Link
        className="underline"
        href={`${inbox}?thread=${encodeURIComponent(params.thread)}`}
      >
        Rudi kwenye mazungumzo
      </Link>
      <ol className="space-y-3">
        {data.items.map((p) => (
          <li key={p.id} className="rounded-lg border p-4 space-y-2">
            <p>Idadi: {p.quantity}</p>
            <p>
              Hali:{" "}
              {p.status === "ACCEPTED"
                ? "Limekubaliwa"
                : p.status === "CANCELLED"
                  ? "Limeondolewa"
                  : "Linahitaji mapitio"}
            </p>
            <time>{p.createdAt.toISOString()}</time>
            {p.status === "OPEN" && (
              <Link
                className="block underline"
                href={`${inbox}?thread=${encodeURIComponent(params.thread!)}&proposal=${p.id}`}
              >
                Hakiki pendekezo hili
              </Link>
            )}
            {p.status === "ACCEPTED" && p.orderId && !data.isSeller && (
              <Link className="block underline" href={`/order/${p.orderId}`}>
                Fungua agizo
              </Link>
            )}
          </li>
        ))}
      </ol>
      {!data.items.length && <p>Hakuna mapendekezo.</p>}
      <nav className="flex gap-4" aria-label="Historia ya mapendekezo">
        <Link
          href={`/chat-proposals?thread=${encodeURIComponent(params.thread)}`}
        >
          Mapya zaidi
        </Link>
        {data.hasMore && (
          <Link
            href={`/chat-proposals?thread=${encodeURIComponent(params.thread)}&before=${data.items.at(-1)!.id}`}
          >
            Ya awali
          </Link>
        )}
      </nav>
    </main>
  );
}
