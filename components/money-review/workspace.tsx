import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  moneyReviewView,
  refundableOrderItems,
} from "@/lib/money-review-views";
import { RequestForm, DecisionForm } from "./forms";
const titles = {
  admin: "Withdrawals & refund reviews",
  supplier: "Withdrawal reviews",
  buyer: "Refund reviews",
};
const routes = {
  admin: "/admin/money-review",
  supplier: "/supplier/withdrawals",
  buyer: "/user/refunds",
};
export default async function MoneyWorkspace({
  scope,
  params = {},
}: {
  scope: keyof typeof titles;
  params?: { page?: string; state?: string; id?: string };
}) {
  const data = await moneyReviewView(scope, params).catch((error) => {
    if (error instanceof Error && error.message === "Unauthorized")
      redirect("/unauthorized");
    throw error;
  });
  if (params.id && !data.cases.length) notFound();
  const items =
    scope === "buyer" && !params.id ? await refundableOrderItems() : [];
  const root = routes[scope];
  return (
    <section className="mx-auto max-w-5xl space-y-5 p-4">
      <h1 className="text-2xl font-bold">{titles[scope]}</h1>
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <p className="font-semibold">
          Manual review only · external execution unavailable
        </p>
        <p>
          No transfers or refunds are sent here. Withdrawal approval retains
          reserved funds; it is not payment evidence. Refund approval is
          unavailable until allocation policy and verified execution are
          configured.
        </p>
      </div>
      {data.balance && (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              ["Wallet (not escrow)", data.balance.wallet],
              ["Reserved withdrawals", data.balance.reserved],
              ["Available before policy checks", data.balance.available],
            ].map(([label, value]) => (
              <div className="rounded border bg-white p-4" key={label}>
                <dt>{label}</dt>
                <dd className="font-bold">TZS {value}</dd>
              </div>
            ))}
          </dl>
          <p>
            Reserved amounts remain in your wallet but cannot back another
            request. Rejecting or cancelling releases the reservation once.
            Legacy requests and open refund cases require reconciliation.
          </p>
        </>
      )}
      {!params.id && scope !== "admin" && (
        <RequestForm
          kind={scope === "supplier" ? "WITHDRAWAL" : "REFUND"}
          items={items}
          blocked={data.balance?.blocked}
        />
      )}
      {!params.id && (
        <form className="flex flex-wrap gap-3">
          <label>
            Status{" "}
            <select
              className="rounded border p-2"
              name="state"
              defaultValue={params.state ?? ""}
            >
              <option value="">All</option>
              {[
                "REQUESTED",
                "UNDER_REVIEW",
                "APPROVED",
                "REJECTED",
                "CANCELLED",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button className="rounded border px-3">Filter</button>
        </form>
      )}
      {!data.cases.length && <p>No review cases found.</p>}
      {data.cases.map((c) => (
        <article
          className="space-y-3 rounded-xl border bg-white p-4"
          key={c.id}
        >
          <h2 className="text-lg font-semibold">
            <Link className="underline" href={`${root}/${c.id}`}>
              {c.kind === "REFUND" ? "Refund" : "Withdrawal"} case{" "}
              {c.id.slice(-8)}
            </Link>
          </h2>
          <p>
            <strong>{c.state.replaceAll("_", " ")}</strong> · TZS {c.amount}
            {c.quantity ? ` · ${c.quantity} item(s)` : ""}
          </p>
          {c.adminContext && (
            <div className="rounded bg-slate-50 p-3 text-sm">
              <p>
                Seller: {c.adminContext.sellerName} · wallet TZS{" "}
                {c.adminContext.wallet}
              </p>
              {c.adminContext.reserved !== undefined && (
                <p>
                  Reserved TZS {c.adminContext.reserved} · available before
                  policy checks TZS {c.adminContext.available}.{" "}
                  {c.adminContext.reconciliationBlocked
                    ? "Reconciliation required before withdrawal approval."
                    : "External execution remains unavailable."}
                </p>
              )}
              {c.adminContext.itemState && (
                <p>
                  Item state: {c.adminContext.itemState} · dispute:{" "}
                  {c.adminContext.disputeState ?? "No dispute record"}
                </p>
              )}
              {c.orderId && (
                <Link
                  className="block underline"
                  href={`/admin/orders/${c.orderId}`}
                >
                  Review original order and payment
                </Link>
              )}
              <p className="break-all">
                Seller ID: {c.adminContext.supplierId}
                <br />
                Requester ID: {c.adminContext.actorId}
              </p>
              <Link
                className="underline"
                href={`/admin/suppliers?q=${c.adminContext.supplierId}`}
              >
                Review seller
              </Link>
            </div>
          )}
          <p className="break-words whitespace-pre-wrap">{c.reason}</p>
          {c.orderId && (
            <>
              <p className="break-all">
                Order: {c.orderId} · Item: {c.productId}
              </p>
              <p>
                {c.paymentVerified
                  ? "Provider settlement recorded; allocation approval still required."
                  : "Payment verification requires operator reconciliation; this amount is only a requested item-value snapshot."}
              </p>
            </>
          )}
          {params.id && (
            <>
              <DecisionForm
                id={c.id}
                kind={c.kind}
                state={c.state}
                admin={scope === "admin"}
              />
              <h3 className="font-semibold">Review history</h3>
              <ol className="space-y-2">
                {c.events.map((event) => (
                  <li key={event.id} className="border-l-2 pl-3">
                    <p>
                      {event.state.replaceAll("_", " ")} ·{" "}
                      {event.createdAt.toISOString()}
                    </p>
                    <p className="break-words whitespace-pre-wrap">
                      {event.reason}
                    </p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </article>
      ))}
      {params.id ? (
        <Link className="underline" href={root}>
          Back to reviews
        </Link>
      ) : (
        <nav aria-label="Review pages" className="flex gap-4">
          {data.page > 1 && (
            <Link
              href={`${root}?page=${data.page - 1}&state=${params.state ?? ""}`}
            >
              Previous
            </Link>
          )}
          <span>
            Page {data.page} · {data.total} cases
          </span>
          {data.page * 20 < data.total && (
            <Link
              href={`${root}?page=${data.page + 1}&state=${params.state ?? ""}`}
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
