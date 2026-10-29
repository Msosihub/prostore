"use client";
import { useState } from "react";
import { retryOrderNotification } from "@/lib/actions/order-notification.actions";
export default function NotificationRetry({
  id,
  unknown,
}: {
  id: string;
  unknown: boolean;
}) {
  const [queued, setQueued] = useState(false);
  const [ack, setAck] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <div className="space-y-2">
      {unknown && (
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          I reviewed the unknown outcome; retrying may send a duplicate SMS.
        </label>
      )}
      <button
        disabled={busy || queued || (unknown && !ack)}
        className="rounded border p-2 disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          try {
            const r = await retryOrderNotification({
              id,
              acknowledgeUnknown: ack,
            });
            setMessage(r.message);
            if (r.success) {
              setQueued(true);
              // Server-action RSC patches can race a router refresh and restore stale
              // rows. A document GET preserves filters and rechecks DB authority.
              window.location.reload();
            }
          } catch {
            setMessage("Unable to queue retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Queue reviewed retry
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
