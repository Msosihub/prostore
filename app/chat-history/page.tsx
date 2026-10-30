import Link from "next/link";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { readChatHistory } from "@/lib/actions/chat-history.actions";
export const metadata = {
  title: "Historia ya mazungumzo",
  robots: { index: false, follow: false },
};
export default async function ChatHistory({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/chat-history");
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 1000 ||
    (params.thread !== undefined &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        params.thread,
      ))
  )
    notFound();
  const data = await readChatHistory(params.thread, page);
  if (params.thread && !data.conversation) notFound();
  const link = (n: number) =>
    `/chat-history?${params.thread ? `thread=${encodeURIComponent(params.thread)}&` : ""}page=${n}`;
  const more = data.conversation
    ? data.conversation.messages.length > 50
    : data.threads.length > 20;
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-24">
      <h1 className="text-2xl font-bold">Historia ya mazungumzo</h1>
      <p>
        Ya kusoma tu. Ujumbe wa zamani haujabadilishwa; si uthibitisho wa
        malipo. Viambatisho havionyeshwi hapa.
      </p>
      <nav className="flex flex-wrap gap-4" aria-label="Mazungumzo">
        <Link className="underline" href="/buyer/messages">
          Ujumbe wa ununuzi
        </Link>
        <Link className="underline" href="/supplier/marketplace-chat">
          Ujumbe wa duka
        </Link>
        <Link className="underline" href="/chat-history">
          Historia yote
        </Link>
      </nav>
      {data.conversation ? (
        <ol className="space-y-3">
          {data.conversation.messages.slice(0, 50).map((m) => (
            <li key={m.id} className="rounded-lg border p-4">
              <time className="text-sm text-slate-600">
                {m.createdAt.toISOString()}
              </time>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {m.content}
              </p>
            </li>
          ))}
          {!data.conversation.messages.length && <li>Hakuna ujumbe.</li>}
        </ol>
      ) : (
        <ul className="space-y-3">
          {data.threads.slice(0, 20).map((t) => (
            <li key={t.id}>
              <Link className="underline" href={`/chat-history?thread=${t.id}`}>
                Mazungumzo — {t.updatedAt.toISOString()}
              </Link>
            </li>
          ))}
          {!data.threads.length && <li>Hakuna historia ya mazungumzo.</li>}
        </ul>
      )}
      <nav className="flex gap-6" aria-label="Kurasa za historia">
        {page > 1 && <Link href={link(page - 1)}>Iliyotangulia</Link>}
        {more && page < 1000 && <Link href={link(page + 1)}>Inayofuata</Link>}
      </nav>
    </main>
  );
}
