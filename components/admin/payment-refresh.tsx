"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function PaymentRefresh({
  orderId,
  admin = false,
}: {
  orderId: string;
  admin?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="space-y-2">
      <button
        disabled={busy}
        className="rounded border px-4 py-2 disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          try {
            const response = await fetch("/api/zenopay/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId, admin }),
            });
            const data = await response.json();
            setMessage(data.message || data.error || "Status unavailable.");
            router.refresh();
          } catch {
            setMessage(
              "Status unavailable. Do not pay again; try checking later.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Checking payment…" : "Check existing payment"}
      </button>
      <p role="status">{message}</p>
      <p className="text-sm text-slate-600">
        Checks are limited to once every 30 seconds. This does not send another
        payment request.
      </p>
    </div>
  );
}
