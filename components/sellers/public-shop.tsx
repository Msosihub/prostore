import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGrid from "@/components/storefront/product-grid";
import { getPublicShop, shopCatalog, shopImage } from "@/lib/public-shop";
import { jsonLd, publicUrl } from "@/lib/storefront-seo";
import ShopShare from "./shop-share";
export async function shopMetadata(
  key: string,
  byId = false,
  query: { q?: string; category?: string; page?: string } = {},
) {
  const shop = await getPublicShop(key, byId);
  if (!shop)
    return {
      title: "Shop unavailable",
      robots: { index: false, follow: false },
    };
  const p = Number(query.page);
  const path =
    shop.path +
    (Number.isSafeInteger(p) && p > 1 && p <= 10000 ? `?page=${p}` : "");
  const image = shopImage(shop.bannerUrl) || shopImage(shop.logo);
  return {
    title: `${shop.name} | Nimboya shop`,
    description: shop.about || `Browse products from ${shop.name} on Nimboya.`,
    alternates: { canonical: publicUrl(path) },
    robots: {
      index: shop.isVerified && !query.q && !query.category,
      follow: true,
    },
    openGraph: {
      title: shop.name,
      description: shop.about || "Explore this seller’s catalog on Nimboya.",
      url: publicUrl(path),
      ...(image ? { images: [image] } : {}),
    },
  };
}
export default async function PublicShop({
  shopKey,
  byId = false,
  query = {},
}: {
  shopKey: string;
  byId?: boolean;
  query?: { q?: string; category?: string; page?: string };
}) {
  const shop = await getPublicShop(shopKey, byId);
  if (!shop) notFound();
  const catalog = await shopCatalog(shop.id, query);
  const pageLink = (page: number) =>
    `${shop.path}?${new URLSearchParams({ ...(catalog.q ? { q: catalog.q } : {}), ...(catalog.category ? { category: catalog.category } : {}), page: String(page) })}`;
  const logo = shopImage(shop.logo),
    banner = shopImage(shop.bannerUrl);
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm">
        <Link href="/" className="underline">
          Home
        </Link>{" "}
        / <span aria-current="page">{shop.name}</span>
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
                name: "Home",
                item: publicUrl("/"),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: shop.name,
                item: publicUrl(shop.path),
              },
            ],
          }),
        }}
      />
      <header className="relative overflow-hidden rounded-3xl bg-emerald-950 text-white">
        {banner && (
          <div className="relative h-36 sm:h-52">
            <img
              src={banner}
              alt=""
              className="size-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <div className="flex flex-col gap-5 p-6 sm:p-9 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {logo ? (
              <img
                src={logo}
                alt=""
                className="size-16 shrink-0 rounded-xl bg-white object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-2xl font-bold"
              >
                {shop.name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-emerald-200">
                Nimboya seller shop
              </p>
              <h1 className="mt-2 break-words text-3xl font-bold sm:text-4xl">
                {shop.name}
              </h1>
              {shop.isVerified && (
                <p className="mt-3 text-sm text-emerald-100">
                  ✓ Seller profile approved by Nimboya
                </p>
              )}
              {shop.tagLine && (
                <p className="mt-3 break-words">{shop.tagLine}</p>
              )}
            </div>
          </div>
          <ShopShare url={publicUrl(shop.path)} />
        </div>
      </header>
      {shop.about && (
        <section className="max-w-3xl py-7">
          <h2 className="text-lg font-semibold">About this shop</h2>
          <p className="mt-2 whitespace-pre-line break-words text-slate-600">
            {shop.about}
          </p>
        </section>
      )}
      <section className="py-7" aria-label="Shop catalog">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Explore the catalog</h2>
            <p className="mt-1 text-sm text-slate-600">
              {catalog.count} matching products · Ask about a product from its
              detail page.
            </p>
          </div>
          <Link href="/search" className="text-sm underline">
            Explore all sellers
          </Link>
        </div>
        <form
          action={shop.path}
          className="mb-6 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <label className="text-sm font-medium">
            Search this shop
            <input
              name="q"
              defaultValue={catalog.q}
              maxLength={100}
              className="mt-1 block w-full rounded-lg border bg-white p-3"
              placeholder="Product name"
            />
          </label>
          <label className="text-sm font-medium">
            Category
            <select
              name="category"
              defaultValue={catalog.category || ""}
              className="mt-1 block w-full rounded-lg border bg-white p-3"
            >
              <option value="">All categories</option>
              {catalog.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_sw || c.name_en}
                </option>
              ))}
            </select>
          </label>
          <button className="self-end rounded-lg bg-emerald-900 px-5 py-3 text-white">
            Find products
          </button>
        </form>
        {catalog.products.length ? (
          <ProductGrid products={catalog.products} />
        ) : (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <h3 className="font-semibold">No products in this view</h3>
            <p className="mt-2 text-slate-600">
              Try another search or return as the seller adds products.
            </p>
            <Link href={shop.path} className="mt-3 inline-block underline">
              Clear filters
            </Link>
          </div>
        )}
        <nav
          aria-label="Catalog pagination"
          className="mt-7 flex items-center justify-center gap-5"
        >
          {catalog.page > 1 && (
            <Link
              href={pageLink(catalog.page - 1)}
              className="rounded border px-4 py-2"
            >
              Previous
            </Link>
          )}
          <span>Page {catalog.page}</span>
          {catalog.page * 24 < catalog.count && (
            <Link
              href={pageLink(catalog.page + 1)}
              className="rounded border px-4 py-2"
            >
              Next
            </Link>
          )}
        </nav>
      </section>
    </main>
  );
}
