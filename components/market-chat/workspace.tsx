"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startMarketThread,
  listMarketThreads,
  loadMarketThread,
  sendMarketMessage,
  markMarketSeen,
  createMarketProposal,
  reviewMarketProposal,
  acceptMarketProposal,
  cancelMarketProposal,
} from "@/lib/actions/market-chat.actions";
import type { ProposalSnapshot } from "@/lib/market-chat";
import type {
  loadThread,
  listThreads,
  reviewProposal,
} from "@/lib/market-chat";
import { saveChatDraft } from "@/lib/chat-draft-storage";
import { formatCurrency } from "@/lib/utils";

type Detail = Awaited<ReturnType<typeof loadThread>>;
type Row = Awaited<ReturnType<typeof listThreads>>["items"][number];
type Review = Exclude<
  Awaited<ReturnType<typeof reviewProposal>>,
  { accepted: true }
>;
const button =
  "rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50";
export default function MarketWorkspace({
  side,
  initialId,
}: {
  side: "buyer" | "seller";
  initialId?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]),
    [more, setMore] = useState(false),
    [id, setId] = useState(initialId || ""),
    [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [content, setContent] = useState(""),
    [quantity, setQuantity] = useState("1");
  const [review, setReview] = useState<(Review & { id: string }) | null>(null);
  const sendKey = useRef<{
      id: string;
      content: string;
      threadId: string;
    } | null>(null),
    proposalKey = useRef<{
      id: string;
      quantity: number;
      threadId: string;
    } | null>(null);
  const pagedList = useRef(false);
  const listCursor = useRef<string | undefined>(undefined);
  const listRows = useRef<Row[]>([]);
  const active = useRef(id);
  active.current = id;
  const refresh = useCallback(async () => {
    const list = await listMarketThreads(side);
    if (list.ok) {
      const previous = listRows.current;
      const gap =
        previous.length > 0 &&
        list.data.hasMore &&
        !list.data.items.some((r) => previous.some((p) => p.id === r.id));
      if (gap) pagedList.current = false;
      listRows.current = gap
        ? list.data.items
        : [
            ...list.data.items,
            ...previous.filter(
              (r) => !list.data.items.some((n) => n.id === r.id),
            ),
          ];
      setRows(listRows.current);
      if (!pagedList.current) {
        listCursor.current = list.data.items.at(-1)?.id;
        setMore(list.data.hasMore);
      }
    } else setError(list.error);
    if (!id) return;
    const result = await loadMarketThread(id);
    if (active.current !== id) return;
    if (!result.ok) {
      setError(result.error);
      setDetail(null);
      return;
    }
    setDetail((old) => {
      // A reconnect can skip more than one page. Reset to the latest page so
      // the older cursor can recover the entire gap rather than merge holes.
      if (
        old?.thread.id === id &&
        old.messages.length &&
        result.data.hasOlder &&
        !result.data.messages.some((m) =>
          old.messages.some((n) => n.id === m.id),
        )
      )
        return result.data;
      const messages = new Map(
        (old?.thread.id === id ? old.messages : []).map((m) => [m.id, m]),
      );
      result.data.messages.forEach((m) => messages.set(m.id, m));
      const keepOldest =
        old?.thread.id === id &&
        old.messages.length > 0 &&
        result.data.messages.length > 0 &&
        (new Date(old.messages[0].createdAt).getTime() <
          new Date(result.data.messages[0].createdAt).getTime() ||
          old.messages[0].id === result.data.messages[0].id);
      return {
        ...result.data,
        hasOlder: keepOldest ? old!.hasOlder : result.data.hasOlder,
        messages: [...messages.values()].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
            a.id.localeCompare(b.id),
        ),
      };
    });
    if (document.visibilityState === "visible")
      await markMarketSeen({
        threadId: id,
        ids: result.data.messages
          .filter((m) => m.senderId !== result.data.viewerId)
          .map((m) => m.id),
      });
  }, [side, id]);
  useEffect(() => {
    let live = true;
    const run = () => {
      if (live)
        void refresh().catch(() =>
          setError("Muunganisho umekatika. Jaribu tena."),
        );
    };
    run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [refresh]);
  function choose(next: string) {
    active.current = next;
    setId(next);
    setDetail(null);
    setReview(null);
    setContent("");
    sendKey.current = null;
    proposalKey.current = null;
    setError("");
    setStatus("");
  }
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await work();
    } catch {
      setError("Muunganisho umekatika. Jaribu tena kwa ombi lilelile.");
    } finally {
      setBusy(false);
    }
  }
  const draftThreadId = detail?.thread.id;
  const draftViewerId = detail?.viewerId;
  useEffect(() => {
    if (!draftThreadId || !draftViewerId) return;
    try {
      const draft = sessionStorage.getItem(
        `market-draft:${draftViewerId}:${draftThreadId}`,
      );
      if (draft) {
        const parsed = JSON.parse(draft);
        sendKey.current = parsed;
        setContent(parsed.content);
      }
      const proposal = sessionStorage.getItem(
        `market-proposal:${draftViewerId}:${draftThreadId}`,
      );
      if (proposal) {
        const parsed = JSON.parse(proposal);
        proposalKey.current = parsed;
        setQuantity(String(parsed.quantity));
      }
    } catch {
      /* Corrupt local draft never grants server authority. */
    }
  }, [draftThreadId, draftViewerId]);
  async function send() {
    await run(async () => {
      const text = content.trim();
      if (!text) return;
      if (
        !sendKey.current ||
        sendKey.current.content !== text ||
        sendKey.current.threadId !== id
      )
        sendKey.current = {
          id: crypto.randomUUID(),
          content: text,
          threadId: id,
        };
      const draftKey = `market-draft:${detail?.viewerId}:${id}`;
      saveChatDraft(draftKey, sendKey.current);
      const result = await sendMarketMessage(sendKey.current);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      saveChatDraft(draftKey, null);
      sendKey.current = null;
      setContent("");
      setStatus("Ujumbe umehifadhiwa.");
      await refresh();
    });
  }
  async function propose() {
    await run(async () => {
      const qty = Number(quantity);
      if (
        !proposalKey.current ||
        proposalKey.current.quantity !== qty ||
        proposalKey.current.threadId !== id
      )
        proposalKey.current = {
          id: crypto.randomUUID(),
          threadId: id,
          quantity: qty,
        };
      const draftKey = `market-proposal:${detail?.viewerId}:${id}`;
      saveChatDraft(draftKey, proposalKey.current);
      const result = await createMarketProposal(proposalKey.current);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      saveChatDraft(draftKey, null);
      proposalKey.current = null;
      setStatus("Pendekezo limehifadhiwa.");
      await refresh();
    });
  }
  async function inspect(proposalId: string) {
    await run(async () => {
      const result = await reviewMarketProposal(proposalId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.data.accepted) {
        router.push(`/order/${result.data.orderId}`);
        return;
      }
      setReview({ ...result.data, id: proposalId });
    });
  }
  async function accept() {
    if (!review) return;
    await run(async () => {
      const result = await acceptMarketProposal({
        id: review.id,
        fingerprint: review.fingerprint,
      });
      if (!result.ok) {
        setError(result.error);
        setReview(null);
        return;
      }
      router.push(`/order/${result.data.orderId}`);
    });
  }
  return (
    <section className="mx-auto max-w-6xl p-3 md:p-6 space-y-4 pb-24">
      <header>
        <h1 className="text-xl font-bold">Mazungumzo ya bidhaa</h1>
        <button
          disabled
          title="Simu za ndani ya programu bado hazijatekelezwa"
          className="my-2 rounded-lg border px-3 py-2 text-sm text-slate-500"
        >
          Simu za ndani ya programu — zinakuja baadaye
        </button>
        <p className="text-sm text-slate-600">
          {side === "seller"
            ? "Wateja wa duka lako"
            : "Ongea na muuzaji, hakiki pendekezo, kisha agiza"}
          . Ujumbe hukaguliwa kila sekunde 5 ukiwa kwenye ukurasa.
        </p>
        <Link
          className="text-sm underline"
          href={side === "seller" ? "/supplier/messages" : "/buyer/chat"}
        >
          Mazungumzo ya awali (Chatwoot)
        </Link>
        <p className="text-xs text-slate-500">
          Kizuizi kipya cha mawasiliano kinatumika hapa; huduma ya awali
          haijabadilishwa.
        </p>
      </header>
      <p className="rounded-xl bg-amber-50 p-3 text-sm">
        Usishiriki simu, barua pepe, akaunti au viungo vya mawasiliano. Usilipe
        kupitia ujumbe. Tumia pendekezo la mfumo na ukurasa wa agizo pekee.
        Ujumbe si uthibitisho wa malipo.
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
          {error}{" "}
          <button className="underline" onClick={() => void run(refresh)}>
            Jaribu tena
          </button>
        </p>
      )}
      <p role="status" className="text-sm text-emerald-800">
        {busy ? "Inahifadhi / inapakia…" : status}
      </p>
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <nav
          aria-label="Mazungumzo"
          className="rounded-xl border bg-white p-3 space-y-2"
        >
          {rows.length === 0 && (
            <p className="text-sm text-slate-600">
              Hakuna mazungumzo bado. Anza kwenye ukurasa wa bidhaa.
            </p>
          )}
          {rows.map((row) => (
            <button
              key={row.id}
              disabled={busy}
              onClick={() => choose(row.id)}
              aria-current={id === row.id ? "page" : undefined}
              className={`block w-full rounded-lg p-3 text-left ${id === row.id ? "bg-emerald-50 ring-1 ring-emerald-600" : "bg-slate-50"}`}
            >
              <span className="block font-medium">{row.product.name}</span>
              <span className="text-xs text-slate-600">
                {side === "seller"
                  ? row.buyer.name
                  : row.supplier.companyName || row.supplier.name}
              </span>
              {row._count.messages > 0 && (
                <span className="ml-2 rounded bg-orange-100 px-2 text-xs">
                  Mpya: {row._count.messages}
                </span>
              )}
            </button>
          ))}
          {more && (
            <button
              className="text-sm underline"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await listMarketThreads(
                    side,
                    listCursor.current,
                  );
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  listRows.current = [
                    ...listRows.current,
                    ...result.data.items.filter(
                      (r) => !listRows.current.some((o) => o.id === r.id),
                    ),
                  ];
                  setRows(listRows.current);
                  listCursor.current = result.data.items.at(-1)?.id;
                  pagedList.current = true;
                  setMore(result.data.hasMore);
                })
              }
            >
              Mazungumzo zaidi
            </button>
          )}
        </nav>
        <div className="min-w-0 space-y-4">
          {!detail ? (
            <p className="rounded-xl border p-6">
              Chagua mazungumzo ya bidhaa.
            </p>
          ) : (
            <>
              <div className="rounded-xl border bg-white p-4">
                <Link
                  href={
                    detail.thread.product.slug
                      ? `/product/${encodeURIComponent(detail.thread.product.slug)}`
                      : "/search"
                  }
                  className="font-semibold underline"
                >
                  {detail.thread.product.name}
                </Link>
                <p className="text-sm">
                  Duka:{" "}
                  {detail.thread.supplier.companyName ||
                    detail.thread.supplier.name}
                </p>
                <p className="text-xs text-slate-600">
                  Bei na idadi zitahakikiwa kwenye pendekezo la mfumo; ujumbe wa
                  kawaida haubadili bei.
                </p>
              </div>
              <div
                className="rounded-xl border bg-white p-3 space-y-3 max-h-[45vh] overflow-y-auto"
                aria-label="Historia ya ujumbe"
              >
                {detail.hasOlder && (
                  <button
                    className="text-sm underline"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const result = await loadMarketThread(
                          id,
                          detail.messages[0]?.id,
                        );
                        if (!result.ok) {
                          setError(result.error);
                          return;
                        }
                        setDetail((old) =>
                          old
                            ? {
                                ...old,
                                messages: [
                                  ...result.data.messages,
                                  ...old.messages.filter(
                                    (m) =>
                                      !result.data.messages.some(
                                        (n) => n.id === m.id,
                                      ),
                                  ),
                                ],
                                hasOlder: result.data.hasOlder,
                              }
                            : old,
                        );
                        if (document.visibilityState === "visible")
                          await markMarketSeen({
                            threadId: id,
                            ids: result.data.messages
                              .filter(
                                (m) => m.senderId !== result.data.viewerId,
                              )
                              .map((m) => m.id),
                          });
                      })
                    }
                  >
                    Ujumbe wa awali
                  </button>
                )}
                {detail.messages.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Uliza kuhusu bidhaa hii. Maandishi pekee yanatumika kwa
                    sasa.
                  </p>
                )}
                {detail.messages.map((m) => (
                  <article
                    key={m.id}
                    className={`max-w-[90%] rounded-xl p-3 ${m.senderId === detail.viewerId ? "ml-auto bg-emerald-50" : "bg-slate-100"}`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {m.content}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {m.senderId === detail.viewerId
                        ? "Wewe · Imehifadhiwa"
                        : "Mshiriki"}{" "}
                      · {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </article>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
                className="rounded-xl border bg-white p-3 space-y-2"
              >
                <label htmlFor="market-message" className="text-sm font-medium">
                  Ujumbe kuhusu bidhaa
                </label>
                <textarea
                  id="market-message"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={2000}
                  disabled={busy}
                  className="w-full rounded-lg border p-2"
                  rows={3}
                />
                <button className={button} disabled={busy || !content.trim()}>
                  Tuma ujumbe
                </button>
              </form>
              {detail.isSeller && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void propose();
                  }}
                  className="rounded-xl border border-emerald-200 bg-white p-4 space-y-2"
                >
                  <h2 className="font-semibold">Andaa pendekezo la mfumo</h2>
                  <p className="text-xs text-slate-600">
                    Bei ya katalogi na punguzo la idadi hutumika. Hakuna bei ya
                    mazungumzo inayowekwa hapa.
                  </p>
                  <label htmlFor="proposal-qty" className="block text-sm">
                    Idadi ya bidhaa
                  </label>
                  <input
                    id="proposal-qty"
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="rounded border p-2 w-28"
                    disabled={busy}
                  />
                  <button className={`${button} ml-2`} disabled={busy}>
                    Tuma pendekezo
                  </button>
                </form>
              )}
              <section aria-label="Mapendekezo ya mfumo" className="space-y-3">
                <h2 className="font-semibold">Mapendekezo 20 ya karibuni</h2>
                {detail.proposals.map((p) => {
                  const q = p.snapshot as unknown as ProposalSnapshot;
                  return (
                    <article
                      key={p.id}
                      className="rounded-xl border border-emerald-200 bg-white p-4 space-y-2"
                    >
                      <p className="font-medium">
                        Pendekezo la mfumo · {p.quantity} ×{" "}
                        {formatCurrency(q.item.price)}
                      </p>
                      <p className="text-sm">
                        Bidhaa {formatCurrency(q.itemsPrice)} · Usafiri{" "}
                        {formatCurrency(q.shippingPrice)} · Kodi{" "}
                        {formatCurrency(q.taxPrice)}
                      </p>
                      <p className="font-bold">
                        Jumla {formatCurrency(q.totalPrice)}
                      </p>
                      {p.status === "ACCEPTED" ? (
                        <p>
                          Agizo limeundwa. Malipo yanathibitishwa kwenye agizo.{" "}
                          {!detail.isSeller && (
                            <Link
                              className="underline"
                              href={`/order/${p.orderId}`}
                            >
                              Fungua agizo
                            </Link>
                          )}
                        </p>
                      ) : p.status === "CANCELLED" ? (
                        <p>Pendekezo limeondolewa.</p>
                      ) : detail.isSeller ? (
                        <button
                          className="text-sm underline"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              const r = await cancelMarketProposal(p.id);
                              if (!r.ok) setError(r.error);
                              else await refresh();
                            })
                          }
                        >
                          Ondoa pendekezo
                        </button>
                      ) : (
                        <button
                          className={button}
                          disabled={busy}
                          onClick={() => void inspect(p.id)}
                        >
                          Hakiki pendekezo
                        </button>
                      )}
                    </article>
                  );
                })}
              </section>
              {review && (
                <section
                  aria-label="Hakiki kabla ya kuagiza"
                  className="rounded-xl border-2 border-emerald-700 bg-white p-4 space-y-3"
                >
                  <h2 className="font-bold">Hakiki kabla ya kuagiza</h2>
                  <p>
                    {review.address.fullName} · {review.address.streetAddress},{" "}
                    {review.address.city}, {review.address.country}
                  </p>
                  <p>Simu ya kupokea: {review.address.phone}</p>
                  <p className="font-bold">
                    Jumla: {formatCurrency(review.quote.totalPrice)}
                  </p>
                  <p className="text-sm">
                    Kukubali kunaunda agizo moja. Hakutumi ombi la malipo bado;
                    utaendelea kwenye ukurasa wa agizo.
                  </p>
                  <Link
                    className="block underline text-sm"
                    href="/user/profile"
                  >
                    Badili anwani kwenye Profile
                  </Link>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => void accept()}
                  >
                    Kubali na unda agizo
                  </button>
                  <button
                    className="ml-3 underline"
                    disabled={busy}
                    onClick={() => setReview(null)}
                  >
                    Funga
                  </button>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
export function StartProductChat({ productId }: { productId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <button
        disabled={busy}
        className="w-full rounded-lg border border-emerald-700 p-3 text-sm font-semibold text-emerald-800 disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await startMarketThread(productId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(`/buyer/messages?thread=${result.data.id}`);
          } catch {
            setError("Imeshindikana kuunganisha. Jaribu tena.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Inafungua…" : "Ongea na muuzaji kuhusu bidhaa"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}{" "}
          <Link
            href={`/sign-in?callbackUrl=${encodeURIComponent("/buyer/messages")}`}
            className="underline"
          >
            Ingia
          </Link>
        </p>
      )}
    </div>
  );
}
