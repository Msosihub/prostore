"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewSeller } from "@/lib/actions/seller-registration.actions";
export default function ReviewForm({
  id,
  version,
}: {
  id: string;
  version: number;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const f = new FormData(e.currentTarget);
        if (
          !confirm(
            "Record this review decision and queue the applicant’s consented SMS notice?",
          )
        )
          return;
        setBusy(true);
        try {
          const r = await reviewSeller({
            id,
            version,
            decision: f.get("decision"),
            reason: f.get("reason"),
          });
          setMessage(r.ok ? "Review recorded." : r.error);
          if (r.ok) router.refresh();
        } catch {
          setMessage(
            "Connection interrupted. Refresh to check the current decision.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor={`decision-${id}`} className="block text-sm">
        Decision
      </label>
      <select
        id={`decision-${id}`}
        name="decision"
        className="rounded border p-2"
      >
        <option value="APPROVED">Approve</option>
        <option value="REJECTED">Reject / revoke approval</option>
      </select>
      <label className="block text-sm">
        Reason shared with applicant
        <textarea
          required
          minLength={3}
          maxLength={500}
          name="reason"
          className="mt-1 block w-full rounded border p-2"
        />
      </label>
      <button
        disabled={busy}
        className="rounded bg-emerald-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Record review"}
      </button>
      <p role="status" className="text-sm">
        {message}
      </p>
    </form>
  );
}
