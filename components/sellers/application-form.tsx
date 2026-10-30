"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { applyToSell } from "@/lib/actions/seller-registration.actions";
export default function ApplicationForm() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  const { update } = useSession();
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          const result = await applyToSell({
            name: data.get("name"),
            username: data.get("username"),
            about: data.get("about"),
            smsConsent: data.get("smsConsent") === "on",
          });
          if (!result.ok) setError(result.error);
          else {
            await update();
            router.refresh();
          }
        } catch {
          setError(
            "Connection interrupted. Refresh to check your application before retrying.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block font-medium">
        Business name
        <input
          required
          name="name"
          minLength={2}
          maxLength={100}
          autoComplete="organization"
          className="mt-2 block w-full rounded-lg border p-3"
        />
      </label>
      <label className="block font-medium">
        Your shop link
        <span className="mt-1 block text-sm font-normal text-slate-600">
          nimboya.com/shops/your-shop — choose carefully; this link stays
          stable.
        </span>
        <input
          required
          name="username"
          minLength={3}
          maxLength={48}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="your-shop"
          className="mt-2 block w-full rounded-lg border p-3"
        />
      </label>
      <label className="block font-medium">
        What do you sell?
        <textarea
          name="about"
          maxLength={600}
          rows={3}
          className="mt-2 block w-full rounded-lg border p-3"
        />
        <span className="text-sm font-normal text-slate-600">
          Optional. Describe your products, without phone numbers, email
          addresses or external links.
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="smsConsent" className="mt-1 size-4" />
        Send application receipt and review updates to my verified sign-in phone
        by SMS. Optional; status is always available here.
      </label>
      <p className="text-sm text-slate-600">
        Your sign-in phone and email are private. Registration requires manual
        review before your new shop is public. WhatsApp notices are not
        available.
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="w-full rounded-xl bg-emerald-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit seller application"}
      </button>
    </form>
  );
}
