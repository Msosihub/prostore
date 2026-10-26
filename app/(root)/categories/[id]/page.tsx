import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/db/prisma";
import { publicProductWhere, storefrontProductSelect } from "@/lib/storefront";
import { catalogPage, catalogParam } from "@/lib/catalog-search";
import { publicUrl, plainDescription, jsonLd } from "@/lib/storefront-seo";
import ProductGrid from "@/components/storefront/product-grid";
const readCategory = cache(async (id: string) =>
  /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)
    ? prisma.category.findUnique({
        where: { id },
        select: {
          id: true,
          name_en: true,
          name_sw: true,
          description: true,
          _count: { select: { products: { where: publicProductWhere } } },
        },
      })
    : null,
);
type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const c = await readCategory(id);
  if (!c)
    return {
      title: "Kundi halijapatikana",
      robots: { index: false, follow: true },
    };
  const page = catalogPage(catalogParam(query.page, "1"));
  return {
    title: `${c.name_sw || c.name_en}${page > 1 ? ` — Ukurasa ${page}` : ""}`,
    description: plainDescription(
      c.description ||
        `Linganisha bidhaa za ${c.name_sw || c.name_en} kutoka maduka kwenye Nimboya.`,
    ),
    alternates: {
      canonical: publicUrl(
        `/categories/${id}${page > 1 ? `?page=${page}` : ""}`,
      ),
    },
    robots: { index: c._count.products > 0, follow: true },
  };
}
export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const c = await readCategory(id);
  if (!c) notFound();
  const page = catalogPage(catalogParam(query.page, "1"));
  const pages = Math.max(1, Math.ceil(c._count.products / 24));
  if (page > pages) notFound();
  const products = await prisma.product.findMany({
    where: { ...publicProductWhere, categoryId: id },
    select: storefrontProductSelect,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 24,
    skip: (page - 1) * 24,
  });
  return (
    <section className="space-y-6 py-6">
      <nav
        aria-label="Uko hapa"
        className="flex flex-wrap gap-2 text-sm text-slate-500"
      >
        <Link href="/">Mwanzo</Link>
        <span>/</span>
        <Link href="/categories">Makundi</Link>
        <span>/</span>
        <span>{c.name_sw || c.name_en}</span>
      </nav>
      <header>
        <h1 className="text-3xl font-bold">{c.name_sw || c.name_en}</h1>
        {c.description && (
          <p className="mt-3 max-w-2xl text-slate-600">
            {plainDescription(c.description, 400)}
          </p>
        )}
        <p className="mt-3 text-sm text-slate-500">
          {c._count.products} bidhaa · Ukurasa {page} wa {pages}
        </p>
      </header>
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <div className="rounded-xl border bg-white p-8">
          <p role="status">Hakuna bidhaa kwenye kundi hili kwa sasa.</p>
          <Link className="mt-4 inline-block underline" href="/categories">
            Gundua makundi mengine
          </Link>
        </div>
      )}
      <nav
        aria-label="Kurasa za kundi"
        className="flex items-center justify-between gap-4"
      >
        {page > 1 ? (
          <Link
            className="rounded-lg border bg-white px-4 py-3"
            href={`/categories/${id}${page > 2 ? `?page=${page - 1}` : ""}`}
          >
            Nyuma
          </Link>
        ) : (
          <span />
        )}
        <span className="text-sm">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link
            className="rounded-lg bg-emerald-900 px-4 py-3 text-white"
            href={`/categories/${id}?page=${page + 1}`}
          >
            Mbele
          </Link>
        ) : (
          <span />
        )}
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Mwanzo",
                item: publicUrl("/"),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Makundi",
                item: publicUrl("/categories"),
              },
              {
                "@type": "ListItem",
                position: 3,
                name: c.name_sw || c.name_en,
                item: publicUrl(`/categories/${id}`),
              },
            ],
          }),
        }}
      />
    </section>
  );
}
