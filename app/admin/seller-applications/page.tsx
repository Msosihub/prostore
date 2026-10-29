import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/db/prisma";
import ReviewForm from "@/components/sellers/review-form";
export const dynamic = "force-dynamic";
export default async function Applications({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; page?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const state = ["PENDING", "APPROVED", "REJECTED"].includes(query.state || "")
    ? query.state!
    : "PENDING";
  const n = Number(query.page || 1);
  const page = Number.isSafeInteger(n) && n > 0 ? Math.min(n, 10000) : 1;
  const where = { state };
  const [rows, count] = await Promise.all([
    prisma.sellerRegistration.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * 20,
      take: 20,
      select: {
        id: true,
        state: true,
        version: true,
        createdAt: true,
        reviewReason: true,
        supplier: {
          select: {
            id: true,
            name: true,
            username: true,
            about: true,
            SupplierDocument: {
              select: { id: true, type: true, verified: true },
            },
          },
        },
        notices: {
          take: 3,
          orderBy: { createdAt: "desc" },
          select: { kind: true, state: true, reason: true, attempts: true },
        },
      },
    }),
    prisma.sellerRegistration.count({ where }),
  ]);
  return (
    <>
      <h1 className="text-3xl font-bold">Seller applications</h1>
      <p className="mt-2 text-slate-600">
        Manual review of business profiles and submitted documents. A queued
        notice is not a sent or delivered SMS.
      </p>
      <nav
        className="my-5 flex flex-wrap gap-4"
        aria-label="Application status"
      >
        {["PENDING", "APPROVED", "REJECTED"].map((s) => (
          <Link
            key={s}
            href={`?state=${s}`}
            aria-current={s === state ? "page" : undefined}
            className="underline"
          >
            {s}
          </Link>
        ))}
      </nav>
      <p>{count} applications</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {rows.map((r) => (
          <article
            key={r.id}
            className="min-w-0 rounded-xl border bg-white p-5"
          >
            <h2 className="break-words text-xl font-semibold">
              {r.supplier.name}
            </h2>
            <p className="text-sm">
              {r.state} · revision {r.version} ·{" "}
              {r.createdAt.toISOString().slice(0, 10)}
            </p>
            <p className="my-3 break-words">{r.supplier.about}</p>
            <p className="text-sm">Shop: {r.supplier.username}</p>
            <Link
              href={`/admin/documents?supplierId=${r.supplier.id}`}
              className="underline"
            >
              Review documents ({r.supplier.SupplierDocument.length})
            </Link>
            {r.reviewReason && (
              <p className="mt-3">Last reason: {r.reviewReason}</p>
            )}
            <ReviewForm id={r.id} version={r.version} />
            {r.notices.map((n, i) => (
              <p key={i} className="text-sm">
                SMS {n.kind}: {n.state} · {n.attempts} attempts · {n.reason}
              </p>
            ))}
          </article>
        ))}
      </div>
      {!rows.length && (
        <p className="rounded-xl bg-white p-8">No applications in this view.</p>
      )}
      <nav className="mt-5 flex gap-5" aria-label="Pagination">
        {page > 1 && (
          <Link href={`?state=${state}&page=${page - 1}`}>Previous</Link>
        )}
        {page * 20 < count && (
          <Link href={`?state=${state}&page=${page + 1}`}>Next</Link>
        )}
      </nav>
    </>
  );
}
