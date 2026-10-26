"use client";
export default function CatalogError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto my-12 max-w-lg rounded-2xl border bg-white p-8">
      <h1 className="text-2xl font-bold">Bidhaa hazipatikani kwa sasa</h1>
      <p className="mt-3 text-slate-600">
        Tumeshindwa kupakia ukurasa. Jaribu tena baada ya muda mfupi.
      </p>
      <button
        className="mt-5 rounded-lg bg-emerald-900 px-5 py-3 text-white"
        onClick={reset}
      >
        Jaribu tena
      </button>
    </section>
  );
}
