"use client";
//1 category, displayed horizontally, with heading
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Product } from "@/types";
import SectionSkeleton from "@/components/skeletons/skeleton-section";
import ProductCard from "@/components/shared/product/product-card";
import useSWR from "swr";

type Props = {
  locale: "en" | "sw";
};

type RandomOneResponse = {
  products: Product[];
  category: any;
};

// generic fetcher that always returns JSON
const fetcher = async (url: string): Promise<RandomOneResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export default function RandomOneSectionHeading({ locale }: Props) {
  const { data, error, isLoading } = useSWR(
    "/api/products/random_one",
    fetcher,
    {
      revalidateOnFocus: true, // refresh when tab refocuses
      refreshInterval: 30000, //optional: auto-refresh every 30s
    }
  );

  if (isLoading) return <SectionSkeleton />;
  if (!data) return <SectionSkeleton />;
  if (error) return <div>Cant fetch data</div>;

  const products = data?.products;
  const cat = data?.category;

  const title = locale === "en" ? cat.name_en : cat.name_sw;
  const subtitle = locale === "en" ? cat.description_en : cat.description_sw;

  return (
    <div className="my-10 space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>

        {/* Arrow Button */}
        <Link
          href={`/category/${cat.id}`} // adjust depending on your route
          className="flex items-center gap-1 text-blue-600 hover:underline"
        >
          <span>See all</span>
          <ChevronRight size={20} />
        </Link>
      </div>

      {/* Scrollable Row */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 scroll-smooth">
          {products.map((product) => (
            <div key={product.slug} className="min-w-[200px] flex-shrink-0">
              <ProductCard
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
