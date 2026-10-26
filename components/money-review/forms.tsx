"use client";
import { useRef, useState } from "react";
import {
  moneyRequestIdentity,
  clearMoneyRequestIdentity,
  type PendingMoneyIdentity,
} from "@/lib/money-request-identity";
import { useRouter } from "next/navigation";
import {
  requestMoneyReview,
  reviewMoneyCase,
} from "@/lib/actions/money-review.actions";
const field = "block w-full rounded border border-slate-400 p-2";
export function RequestForm({
  kind,
  actorId,
  items = [],
  blocked = false,
}: {
  kind: "WITHDRAWAL" | "REFUND";
  actorId: string;
  items?: { orderId: string; productId: string; name: string; qty: number }[];
  blocked?: boolean;
}) {
  const router = useRouter();
  const identity = useRef<PendingMoneyIdentity | undefined>(undefined);
  const owner = `${actorId}:${kind}`;
  const storage = () => {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  };
  const [resetBlocked, setResetBlocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="space-y-3 rounded-xl border bg-white p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending || resetBlocked) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        const item = items.find(
          (i) => `${i.orderId}:${i.productId}` === data.get("item"),
        );
        setPending(true);
        try {
          const payload = {
            kind,
            reason: String(data.get("reason") ?? "").trim(),
            ...(kind === "WITHDRAWAL"
              ? { amount: data.get("amount") }
              : {
                  orderId: item?.orderId,
                  productId: item?.productId,
                  quantity: Number(data.get("quantity")),
                }),
          };
          identity.current = await moneyRequestIdentity(
            storage(),
            owner,
            payload,
            identity.current,
          );
          const result = await requestMoneyReview({
            ...payload,
            requestKey: identity.current.requestKey,
          });
          setMessage(
            result.message +
              (!result.success && !identity.current.persistent
                ? " Browser retry storage is unavailable; keep this page open and check existing cases before resubmitting."
                : ""),
          );
          if (result.success) {
            const cleared = clearMoneyRequestIdentity(storage(), owner);
            setResetBlocked(!cleared);
            if (!cleared)
              setMessage(
                "Case saved. Browser retry metadata could not be cleared; a new request is unavailable until reset succeeds. Existing cases are unchanged.",
              );
            identity.current = undefined;
            form.reset();
            router.refresh();
          }
        } catch (error) {
          setMessage(
            error instanceof Error &&
              (error.message.startsWith("An earlier request") ||
                error.message.startsWith("Check existing"))
              ? error.message
              : "Connection interrupted. Retry unchanged details to recover the same request; check existing cases before starting another.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <h2 className="text-xl font-semibold">
        {kind === "WITHDRAWAL"
          ? "Request withdrawal review"
          : "Request item refund review"}
      </h2>
      {kind === "WITHDRAWAL" ? (
        <label className="block">
          Amount (TZS)
          <input
            className={field}
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            disabled={pending}
          />
        </label>
      ) : (
        <>
          <label className="block">
            Paid order item
            <select
              aria-label="Paid order item"
              className={field}
              name="item"
              required
              disabled={pending}
            >
              <option value="">Choose an item</option>
              {items.map((i) => (
                <option
                  key={`${i.orderId}:${i.productId}`}
                  value={`${i.orderId}:${i.productId}`}
                >
                  {i.name} · order {i.orderId.slice(-8)} · purchased {i.qty}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Quantity for review
            <input
              className={field}
              name="quantity"
              type="number"
              min="1"
              step="1"
              required
              disabled={pending}
            />
          </label>
          <p className="text-sm">
            Items from your latest 50 paid orders are shown. Older orders
            require support. Amounts use the original item price; shipping, tax
            and fees need separate review.
          </p>
        </>
      )}
      <label className="block">
        Reason (no bank details or private contact information)
        <textarea
          className={field}
          name="reason"
          minLength={5}
          maxLength={500}
          required
          disabled={pending}
        />
      </label>
      <label className="flex gap-2">
        <input type="checkbox" required disabled={pending} />I understand this
        requests review only. No transfer or refund will be sent.
      </label>
      {blocked && (
        <p role="status">
          Requests are paused while legacy payouts or refund cases require
          reconciliation.
        </p>
      )}
      <button
        className="rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50"
        disabled={
          pending ||
          resetBlocked ||
          blocked ||
          (kind === "REFUND" && !items.length)
        }
      >
        {pending ? "Saving…" : "Submit review request"}
      </button>
      <button
        type="button"
        className="block text-sm underline"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              "Check your existing cases first. Start a different request only if you intend an additional reservation or review.",
            )
          )
            return;
          const cleared = clearMoneyRequestIdentity(storage(), owner);
          identity.current = undefined;
          setResetBlocked(!cleared);
          if (!cleared) {
            setMessage(
              "Browser retry metadata could not be cleared. Check existing cases; a different request is unavailable until reset succeeds.",
            );
            return;
          }
          setMessage(
            "Ready for a different request. Existing cases were not changed.",
          );
        }}
      >
        Start another request
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
export function DecisionForm({
  id,
  state,
  kind,
  admin,
}: {
  id: string;
  state: string;
  kind: string;
  admin: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  if (["REJECTED", "CANCELLED"].includes(state)) return null;
  return (
    <form
      className="space-y-3 border-t pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending) return;
        const data = new FormData(e.currentTarget);
        setPending(true);
        try {
          const r = await reviewMoneyCase({
            id,
            state: data.get("state"),
            reason: data.get("reason"),
          });
          setMessage(r.message);
          if (r.success) router.refresh();
        } catch {
          setMessage(
            "Connection interrupted. Refresh the case before retrying.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="block">
        Decision
        <select
          aria-label="Decision"
          name="state"
          className={field}
          disabled={pending}
        >
          {admin ? (
            <>
              {state !== "APPROVED" && (
                <option value="UNDER_REVIEW">Start review</option>
              )}
              {kind === "WITHDRAWAL" && state !== "APPROVED" && (
                <option value="APPROVED">
                  Approve review only — retain hold, no transfer
                </option>
              )}
              <option value="REJECTED">Reject and release request hold</option>
            </>
          ) : (
            <option value="CANCELLED">
              Cancel request and release request hold
            </option>
          )}
        </select>
      </label>
      <label className="block">
        Decision reason
        <textarea
          className={field}
          name="reason"
          required
          minLength={5}
          maxLength={500}
          disabled={pending}
        />
      </label>
      <label className="flex gap-2">
        <input type="checkbox" required disabled={pending} />
        Confirm this review decision. It does not record money sent.
      </label>
      <button
        disabled={pending}
        className="rounded border border-emerald-800 px-4 py-2"
      >
        {pending ? "Saving…" : "Save decision"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
