"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="space-y-3 p-6">
      <h1 className="text-xl font-bold">Review cases unavailable</h1>
      <p>
        We could not load these records. No financial action was taken. Please
        retry.
      </p>
      <button className="rounded border p-2" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
