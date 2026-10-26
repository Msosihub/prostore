"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  requestMoneyReview,
  reviewMoneyCase,
} from "@/lib/actions/money-review.actions";
const field = "block w-full rounded border border-slate-400 p-2";
export function RequestForm({
  kind,
  items = [],
  blocked = false,
}: {
  kind: "WITHDRAWAL" | "REFUND";
  items?: { orderId: string; productId: string; name: string; qty: number }[];
  blocked?: boolean;
}) {
  const router = useRouter();
  const key = useRef<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="space-y-3 rounded-xl border bg-white p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        key.current ??= crypto.randomUUID();
        const item = items.find(
          (i) => `${i.orderId}:${i.productId}` === data.get("item"),
        );
        setPending(true);
        try {
          const result = await requestMoneyReview({
            kind,
            requestKey: key.current,
            reason: data.get("reason"),
            ...(kind === "WITHDRAWAL"
              ? { amount: data.get("amount") }
              : {
                  orderId: item?.orderId,
                  productId: item?.productId,
                  quantity: Number(data.get("quantity")),
                }),
          });
          setMessage(result.message);
          if (result.success) {
            key.current = undefined;
            form.reset();
            router.refresh();
          }
        } catch {
          setMessage(
            "Connection interrupted. Retry unchanged details to recover the same request.",
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
        disabled={pending || blocked || (kind === "REFUND" && !items.length)}
      >
        {pending ? "Saving…" : "Submit review request"}
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
