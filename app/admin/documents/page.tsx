import Link from "next/link";
import { getAdminDocuments } from "@/lib/admin-operations";
import AdminPagination from "@/components/admin/pagination";
import DocumentDecision from "@/components/admin/document-decision";
export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getAdminDocuments(await searchParams);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Seller documents</h1>
      <p>
        Pending documents exclude rejected submissions. Review oldest
        submissions first; seller verification remains a separate decision under
        your configured policy.
      </p>
      <form
        action="/admin/documents"
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="supplierId" value={data.supplierId} />
        <label className="flex flex-col gap-1">
          Document status
          <select
            name="status"
            defaultValue={data.filters.status || "pending"}
            className="rounded border bg-white p-2"
          >
            <option value="pending">Awaiting review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All documents</option>
          </select>
        </label>
        <button className="rounded bg-emerald-800 px-4 py-2 text-white">
          Apply filters
        </button>
        <Link className="p-2 underline" href="/admin/documents">
          Clear seller filter
        </Link>
      </form>
      {!data.items.length && (
        <p role="status" className="rounded-xl border bg-white p-6">
          No documents match these filters.
        </p>
      )}
      {data.items.map((doc) => (
        <article
          key={doc.id}
          className="space-y-3 rounded-xl border bg-white p-4"
        >
          <h2 className="font-semibold">
            {doc.label} · {doc.supplier.name}
          </h2>
          <p>
            {doc.uploadedAt.toISOString().slice(0, 10)} ·{" "}
            {doc.verified
              ? "Approved"
              : doc.rejectionReason !== null
                ? "Rejected"
                : "Awaiting review"}
          </p>
          {doc.rejectionReason && (
            <p className="break-words">Reason: {doc.rejectionReason}</p>
          )}
          {doc.type && <p>Document type: {doc.type}</p>}
          {doc.description && <p className="break-words">{doc.description}</p>}
          <div className="flex flex-wrap gap-3">
            {[
              ...new Set(
                [
                  doc.fileUrl,
                  ...(Array.isArray(doc.files) ? doc.files : []),
                ].filter(
                  (url): url is string =>
                    typeof url === "string" && /^https?:\/\//i.test(url),
                ),
              ),
            ].map((url, index) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Open attachment {index + 1} (new tab)
              </a>
            ))}
          </div>
          <DocumentDecision id={doc.id} />
        </article>
      ))}
      <AdminPagination
        path="/admin/documents"
        {...data}
        extra={{ supplierId: data.supplierId }}
      />
    </section>
  );
}
