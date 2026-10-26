"use client";
import { useState } from "react";
import { setOrderSmsPreference } from "@/lib/actions/order-notification.actions";
export default function OrderSmsPreference({ enabled }: { enabled: boolean }) {
  const [value, setValue] = useState(enabled),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await setOrderSmsPreference(value);
          setMessage(r.message);
        } catch {
          setMessage("Unable to save preference.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => setValue(e.target.checked)}
        />
        Receive transactional order SMS
      </label>
      <p>
        This covers purchase, seller order and fulfillment updates. It does not
        control login OTP or introduce marketing messages. Account order pages
        remain available. A message already being sent may still arrive.
      </p>
      <button disabled={busy} className="rounded border px-4 py-2">
        Save SMS preference
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
