"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
export default function ShoppingLoading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <section
      aria-label="Ukurasa unapakiwa"
      className="mx-auto w-full max-w-7xl px-3 py-8 sm:px-6 sm:py-12"
    >
      <div className="mb-7 flex items-start gap-4 rounded-2xl border border-emerald-900/10 bg-white p-5 sm:p-7">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-amber-200"
        >
          <ShoppingBag size={25} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-800">
            Nimboya
          </p>
          <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
            Tunaandaa ukurasa wako
          </h2>
          <p
            role="status"
            aria-live="polite"
            className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600"
          >
            {slow
              ? "Inachukua muda kuliko kawaida. Unaweza kuendelea kusubiri au kujaribu kupakia tena."
              : "Tafadhali subiri kidogo. Taarifa za ukurasa zitaonekana zikishapatikana."}
          </p>
          {slow && (
            <div className="mt-4 flex flex-wrap gap-4">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Pakia tena
              </button>
              <Link
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
                href="/"
              >
                Rudi mwanzo
              </Link>
            </div>
          )}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="space-y-6 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        <div className="grid gap-6 rounded-3xl bg-emerald-950/5 p-6 sm:grid-cols-2 sm:p-10">
          <div className="space-y-4 py-4">
            <div className="h-3 w-28 rounded bg-emerald-900/10" />
            <div className="h-9 w-4/5 rounded bg-emerald-900/10" />
            <div className="h-9 w-3/5 rounded bg-emerald-900/10" />
            <div className="h-4 w-full rounded bg-emerald-900/10" />
            <div className="mt-6 h-11 w-40 rounded-xl bg-emerald-900/10" />
          </div>
          <div className="hidden min-h-52 rounded-2xl bg-white/80 sm:block" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border bg-white"
            >
              <div className="aspect-[4/3] bg-slate-100" />
              <div className="space-y-3 p-4">
                <div className="h-3 w-4/5 rounded bg-slate-100" />
                <div className="h-4 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
