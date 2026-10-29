"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeSellerNoticeConsent } from "@/lib/actions/seller-registration.actions";
export default function NoticePreference({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="mt-5 border-t pt-4">
      <p className="text-sm">
        Application SMS updates: {enabled ? "enabled" : "off"}. Past suppressed
        notices are not resent.
      </p>
      <button
        disabled={busy}
        className="mt-2 text-sm underline disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          try {
            const r = await changeSellerNoticeConsent(!enabled);
            setError(r.ok ? "" : r.error);
            if (r.ok) router.refresh();
          } catch {
            setError("Unable to update. Please retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Saving…"
          : enabled
            ? "Turn off application SMS"
            : "Enable future application SMS"}
      </button>
      <p role="status" className="text-sm">
        {error}
      </p>
    </div>
  );
}
