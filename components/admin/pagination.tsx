import Link from "next/link";
export default function AdminPagination({
  path,
  page,
  pages,
  total,
  filters,
  extra = {},
}: {
  path: string;
  page: number;
  pages: number;
  total: number;
  filters: { q?: string; status?: string };
  extra?: Record<string, string>;
}) {
  const href = (next: number) =>
    `${path}?${new URLSearchParams({
      ...extra,
      q: filters.q || "",
      status: filters.status || "",
      page: String(next),
    })}`;
  return (
    <nav
      aria-label="Results pages"
      className="flex flex-wrap items-center justify-between gap-3 py-4"
    >
      <p>
        {total} results · Page {page} of {pages}
      </p>
      <div className="flex gap-4">
        {page > 1 && (
          <Link className="underline" href={href(page - 1)}>
            Previous
          </Link>
        )}
        {page < pages && (
          <Link className="underline" href={href(page + 1)}>
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
