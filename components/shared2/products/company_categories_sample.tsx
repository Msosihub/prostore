"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Product, CategorySummary } from "@/types";
import CategoryTabs from "./CategoryTabs";
import ProductList from "@/components/shared/product/product-list";
import { Loader2 } from "lucide-react";

export default function CompanyCategoriesProducts({
  locale,
  supplierId,
}: {
  locale: "en" | "sw";
  supplierId: string;
}) {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef<IntersectionObserver | null>(null);

  // Load categories only once
  useEffect(() => {
    fetch(`/api/products/company_categories?supplierId=${supplierId}`)
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories);
        if (data.categories.length > 0)
          setActiveCategoryId(data.categories[0].id);
      });
  }, [supplierId]);

  // Fetch logic
  const loadProducts = useCallback(
    async (catId: string, pageNum: number, reset: boolean) => {
      setLoading(true);
      const res = await fetch(
        `/api/products/by_category?supplierId=${supplierId}&categoryId=${catId}&page=${pageNum}`
      );
      const data = await res.json();

      setProducts((prev) =>
        reset ? data.products : [...prev, ...data.products]
      );
      setHasMore(data.products.length === 12); // If we got less than 12, there are no more
      setLoading(false);
    },
    [supplierId]
  );

  // Reset when tab changes
  useEffect(() => {
    if (activeCategoryId) {
      setPage(1);
      setHasMore(true);
      loadProducts(activeCategoryId, 1, true);
    }
  }, [activeCategoryId, loadProducts]);

  console.log("Page: ", page);

  // Sensor for the bottom of the page
  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => {
            const nextPage = prev + 1;
            loadProducts(activeCategoryId!, nextPage, false);
            return nextPage;
          });
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, activeCategoryId, loadProducts]
  );

  return (
    <div className="space-y-6">
      <CategoryTabs
        categories={categories}
        activeId={activeCategoryId}
        onSelect={setActiveCategoryId}
        locale={locale}
      />

      <div className="min-h-[400px]">
        <ProductList data={products} variant="grid" locale={locale} />

        {/* THE SENSOR / LOADER */}
        <div ref={lastElementRef} className="py-10 flex justify-center">
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          ) : !hasMore && products.length > 0 ? (
            <p className="text-gray-400 text-sm">Mwisho wa bidhaa</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
