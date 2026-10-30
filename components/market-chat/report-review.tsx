"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewMarketReport } from "@/lib/actions/market-chat.actions";
export default function ReportReview({ id }: { id: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          const r = await reviewMarketReport(id, String(data.get("decision")));
          if (!r.ok) setError(r.error);
          else router.refresh();
        } catch {
          setError("Unable to save. Retry safely.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        Review decision
        <select name="decision" className="block border p-2" disabled={busy}>
          <option value="FOLLOW_UP">Needs staff follow-up</option>
          <option value="NO_ACTION">No action identified</option>
        </select>
      </label>
      <p>
        Records a review only. It does not suspend an account, remove a
        participant block, send a message, or resolve an order dispute.
      </p>
      <button
        disabled={busy}
        className="rounded bg-emerald-800 px-4 py-2 text-white"
      >
        {busy ? "Saving…" : "Record review"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
