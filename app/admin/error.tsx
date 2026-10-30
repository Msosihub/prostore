"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="space-y-3 rounded-xl border bg-white p-6">
      <h1 className="text-xl font-bold">Unable to load platform records</h1>
      <p>Please retry. Missing data is not shown as zero activity.</p>
      <button
        onClick={reset}
        className="rounded bg-emerald-800 px-4 py-2 text-white"
      >
        Try again
      </button>
    </section>
  );
}
