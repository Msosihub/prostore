"use client";
import { useState } from "react";
export default function ShopShare({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  return (
    <div>
      <button
        type="button"
        className="rounded-full border border-white/40 px-4 py-2 text-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setMessage("Shop link copied.");
          } catch {
            setMessage(`Copy this shop link: ${url}`);
          }
        }}
      >
        Copy shop link
      </button>
      <p role="status" className="mt-2 max-w-xs break-all text-sm">
        {message}
      </p>
    </div>
  );
}
