"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function DocumentDecision({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function decide(verified: boolean) {
    const reason = verified
      ? undefined
      : window.prompt("Reason for rejection (visible to seller):")?.trim();
    if (!verified && !reason) return;
    if (
      !window.confirm(
        verified
          ? "Approve this document? This does not automatically verify the seller unless your configured policy enables it."
          : "Reject this document and save the reason?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/supplier-docs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified, rejectionReason: reason }),
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch {
      setError(
        "Decision could not be saved. Refresh the records before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <button
          disabled={busy}
          onClick={() => void decide(true)}
          className="rounded bg-emerald-800 px-3 py-2 text-white disabled:opacity-50"
        >
          Approve document
        </button>
        <button
          disabled={busy}
          onClick={() => void decide(false)}
          className="rounded border px-3 py-2 disabled:opacity-50"
        >
          Reject document
        </button>
      </div>
      {busy && <p role="status">Saving decision…</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
