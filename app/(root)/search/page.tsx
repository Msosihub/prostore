import Pagination from "@/components/shared/pagination4";
import ProductCard from "@/components/shared/product/product-card";
import SkeletonProduct from "@/components/shared/product/skeleton-product";
import { Button } from "@/components/ui/button";
import { getAllProducts } from "@/lib/actions/product.actions";
import Link from "next/link";
import { X, RefreshCw, SlidersHorizontal } from "lucide-react";

// Localized dynamic Swahili translation sorting dictionary tags
const sortOrdersMap = [
  { key: "newest", label: "Zilizomupya" },
  { key: "lowest", label: "Bei ya Chini" },
  { key: "highest", label: "Bei ya Juu" },
  { key: "rating", label: "Nyota Bora" },
];

export async function generateMetadata(props: {
  searchParams: Promise<{
    q: string;
    category: string;
    price: string;
    rating: string;
  }>;
}) {
  const {
    q = "all",
    category = "all",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    price = "all",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rating = "all",
  } = await props.searchParams;

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
  searchParams: Promise<{
    q?: string;
    category?: string;
    price?: string;
    rating?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const {
    q = "all",
    category = "all",
    price = "all",
    rating = "all",
    sort = "newest",
    page = "1",
  } = await props.searchParams;

  const currentPage =
    isNaN(Number(page)) || Number(page) < 1 ? 1 : Number(page);

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
              <Link href="/search">
                <X className="w-3 h-3" /> Safisha Zote
              </Link>
            </Button>
          )}
        </div>

        {/* 🟢 SWAHILI SORTING CONTROLLER PANEL */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 shrink-0">
          <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">
            Panga kwa:
          </span>
          {sortOrdersMap.map((s) => {
            const isActive = sort === s.key;
            return (
              <Link
                key={s.key}
                href={getFilterUrl({ s: s.key })}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 🟢 PRODUCT CARDS GRID DISPLAY BLOCK */}
      {products.data.length === 0 ? (
        // Render beautiful responsive empty layout or skeletons context parameters
        q !== "all" && q !== "" ? (
          <div className="text-center py-16 border border-dashed rounded-2xl bg-white shadow-sm space-y-2">
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Hatukupata bidhaa zinazolingana na utafutaji wako.
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-xl border-slate-200"
            >
              <Link href="/search" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Onyesha Zote
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full">
            {[...Array(8)].map((_, i) => (
              <SkeletonProduct key={i} />
            ))}
          </div>
        )
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
