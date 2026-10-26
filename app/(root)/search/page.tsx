/* Native GET navigation keeps search recovery independent of the client router. */
/* eslint-disable @next/next/no-html-link-for-pages */
import Pagination from "@/components/shared/pagination4";
import ProductCard from "@/components/shared/product/product-card";
import { catalogPage, catalogParam } from "@/lib/catalog-search";
import { Button } from "@/components/ui/button";
import { getAllProducts } from "@/lib/actions/product.actions";
import { X, RefreshCw, SlidersHorizontal } from "lucide-react";

// Localized dynamic Swahili translation sorting dictionary tags
const sortOrdersMap = [
  { key: "newest", label: "Mpya zaidi" },
  { key: "lowest", label: "Bei ya Chini" },
  { key: "highest", label: "Bei ya Juu" },
  { key: "rating", label: "Nyota Bora" },
];

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata(props: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.searchParams;
  const q = catalogParam(params.q, "all").trim();
  const category = catalogParam(params.category, "all");

  const isQuerySet = q && q !== "all" && q.trim() !== "";
  const isCategorySet =
    category && category !== "all" && category.trim() !== "";

  // 🟢 ALIBABA/AMAZON GRADE RICH SEO INDEX METADATA HEADERS
  if (isQuerySet || isCategorySet) {
    return {
      title: `Tafuta ${isQuerySet ? `"${q}"` : ""} ${isCategorySet ? `katika ${category}` : ""} | Nimboya Soko la Jumla`,
      description: `Gundua bei bora za jumla kwa ${q || category} kutoka kwa wasambazaji waliothibitishwa kote Tanzania kwenye Nimboya Marketplace.`,
    };
  }
  return { title: "Tafuta Bidhaa za Jumla | Nimboya" };
}

export default async function SearchPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.searchParams;
  const q = catalogParam(params.q, "all").trim();
  const category = catalogParam(params.category, "all");
  const price = catalogParam(params.price, "all");
  const rating = catalogParam(params.rating, "all");
  const sort = catalogParam(params.sort, "newest");
  const page = catalogParam(params.page, "1");

  const currentPage = catalogPage(page);

  const getFilterUrl = ({
    c,
    p,
    s,
    r,
    pg,
  }: {
    c?: string;
    p?: string;
    s?: string;
    r?: string;
    pg?: string;
  }) => {
    const params = { q, category, price, rating, sort, page: "1" };

    if (c) params.category = c;
    if (p) params.price = p;
    if (s) params.sort = s;
    if (r) params.rating = r;
    if (pg) params.page = pg;

    return `/search?${new URLSearchParams(params).toString()}`;
  };

  const products = await getAllProducts({
    query: q,
    category,
    price,
    rating,
    sort,
    page: currentPage,
  });

  const hasActiveFilters =
    (q !== "all" && q !== "") ||
    (category !== "all" && category !== "") ||
    rating !== "all" ||
    price !== "all";

  return (
    <div className="w-full space-y-4 pb-12 pt-2">
      {/* 🟢 TOP LAYER BLOCK: Interactive Filter Summary and Sorting Controls */}
      <div className="w-full bg-white border border-slate-100 p-3 sm:p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
        {/* Active Breadcrumb filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1 font-semibold text-slate-500 mr-1 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Vichujio:</span>
          </div>

          {!hasActiveFilters && (
            <span className="text-slate-400 italic font-light">
              Zote (All records)
            </span>
          )}

          {q !== "all" && q !== "" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
              Neno: {q}
            </span>
          )}
          {category !== "all" && category !== "" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
              Kundi: {category}
            </span>
          )}
          {price !== "all" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              Bei: {price}
            </span>
          )}
          {rating !== "all" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
              Nyota: {rating}+ ★
            </span>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-6 text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full px-2.5 flex items-center gap-0.5 ml-1"
            >
              <a href="/search">
                <X className="w-3 h-3" /> Safisha Zote
              </a>
            </Button>
          )}
        </div>

        {/* 🟢 SWAHILI SORTING CONTROLLER PANEL */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 min-w-0 max-w-full">
          <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">
            Panga kwa:
          </span>
          {sortOrdersMap.map((s) => {
            const isActive = sort === s.key;
            return (
              <a
                key={s.key}
                aria-current={isActive ? "true" : undefined}
                href={getFilterUrl({ s: s.key })}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {s.label}
              </a>
            );
          })}
        </div>
      </div>

      {/* 🟢 PRODUCT CARDS GRID DISPLAY BLOCK */}
      {products.data.length === 0 ? (

          <div role="status" className="text-center py-16 border border-dashed rounded-2xl bg-white shadow-sm space-y-2">
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Hatukupata bidhaa zinazolingana na utafutaji wako.
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-xl border-slate-200"
            >
              <a href="/search" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Onyesha Zote
              </a>
            </Button>
          </div>
      ) : (
        // 🔲 RESPONSIVE FLEX GRID: Renders flawless 2 columns on phones scaling cleanly to 4 on widescreen layouts
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full">
          {products.data.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              slug={product.slug}
              name={product.name}
              brand={product.brand?.name ?? ""}
              category={
                product.category?.name_sw || product.category?.name_en || ""
              }
              subcategory={
                product.subcategory?.name_sw ||
                product.subcategory?.name_en ||
                ""
              }
              supplier={product.supplier?.companyName || "Muuzaji"}
              images={product.images}
              price={Number(product.price)}
              stock={product.stock}
              pricingTiers={product.pricingTiers}
            />
          ))}
        </div>
      )}

      {/* 🟢 PAGINATION ACTION TRIGGER LAYER */}
      {products.totalPages > 1 && (
        <div className="w-full flex justify-center pt-6 select-none">
          <Pagination
            currentPage={currentPage}
            totalPages={products.totalPages}
          />
        </div>
      )}
    </div>
  );
}
