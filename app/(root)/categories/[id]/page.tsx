"use client";

import useSWRInfinite from "swr/infinite";
import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import ProductCard from "@/components/shared/product/product-card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CategoryProductsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const PAGE_SIZE = 12;
  const paramsx = React.use(params);
  const id = paramsx.id;

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasMore) return null; // ✅ stop if no more
    return `/api/shared/categories/${id}/products?page=${pageIndex + 1}&limit=${PAGE_SIZE}`;
  };

  const { data, error, size, setSize, isValidating } = useSWRInfinite(
    getKey,
    fetcher
  );

  const products = data ? data.flatMap((page: any) => page.products) : [];

  const isLoadingInitial = !data && !error;
  const isLoadingMore =
    isLoadingInitial ||
    (size > 0 && data && typeof data[size - 1] === "undefined");

  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Only fetch if there are more pages
          const lastPage = data?.[data.length - 1];
          if (lastPage?.hasMore) {
            setSize(size + 1);
          }
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [size, setSize, data]);

  if (error) return <div className="p-4">Failed to load products.</div>;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-xl font-semibold mb-4">Products</h1>

      {isLoadingInitial ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="rounded-xl shadow-sm">
              <Skeleton className="h-32 w-full rounded-t-xl" />
              <CardContent className="p-2">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.slug}
              id={product.id}
              slug={product.slug}
              name={product.name}
              brand={product?.brand?.name || ""}
              category={product.category?.name_en ?? ""}
              subcategory={product?.subcategory?.name_en || ""}
              supplier={product?.supplier?.companyName ?? "<no supplier>"}
              images={product.images}
              price={Number(product.price)}
              stock={product.stock}
              pricingTiers={product.pricingTiers}
            />
          ))}
        </div>
      )}

      {(isLoadingMore || isValidating) && (
        <div className="flex justify-center p-4">
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      )}

      {/* loader sentinel */}
      <div ref={loaderRef} className="h-8" />
    </div>
  );
}
