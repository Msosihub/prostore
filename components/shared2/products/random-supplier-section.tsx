"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import useSWR from "swr";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Product, Supplier } from "@/types";
import ProductCard from "@/components/shared/product/product-card";
import SectionSkeleton from "@/components/skeletons/skeleton-section";

type ProductsResponse = {
  products: Product[];
  supplier: Supplier;
};

// generic fetcher that always returns JSON
const fetcher = async (url: string): Promise<ProductsResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export default function RandomSupplierSection() {
  const { data, error, isLoading } = useSWR(
    "/api/products/random-supplier",
    fetcher,
    {
      revalidateOnFocus: true, // refresh when tab refocuses
      refreshInterval: 30000, //optional: auto-refresh every 30s
    }
  );

  if (isLoading) return <SectionSkeleton />;
  if (!data) return <SectionSkeleton />;
  if (error) return <div>Mmmh, Nimeishiwa pawa!</div>;

  const products = data?.products;
  const sup = data?.supplier;

  // scroll handler for arrows
  const scrollLeft = () => {
    const scroller = document.getElementById("supplier-scroll");
    scroller?.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    const scroller = document.getElementById("supplier-scroll");
    scroller?.scrollBy({ left: 300, behavior: "smooth" });
  };

  return (
    <div className="my-10 space-y-3 rounded-sm">
      {/* Header Row */}
      <div className="p-2 rounded-sm sm:p-2 flex flex-row justify-between gap-1 sm:gap-2 text-xs sm:text-sm bg-blue-50">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-0">
            {/* {supplier.logo && ( */}
            <Image
              src={sup.logo || "/images/logo.svg"}
              alt="Logo"
              width={55}
              height={55}
              className="rounded-sm object-cover"
              priority // ✅ preload immediately
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start gap-1">
              <Link
                href={sup.id ?? "#"}
                className="font-bold underline  text-sm sm:text-base md:text-lg line-clamp-2"
              >
                {sup.companyName}
              </Link>

              <div className="text-[11px] sm:text-xs md:text-sm text-muted-foreground">
                {/* {sup.isVerified && */}
                <Badge
                  variant="outline"
                  className="text-blue-600 px-2 bg-blue-50"
                >
                  Verified Supplier
                </Badge>
                • {"Multispecialty Supplier"}
                <div className={"pl-0"}>
                  • {sup.yearsActive}+ yrs on Prostore • {sup.nation}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow Link */}
        <Link
          href={`/company/${sup.id}/home`} // adjust as needed
          className="flex items-center gap-1 text-blue-600 hover:underline ml-4"
        >
          <span>See all</span>
          <ChevronRight size={20} />
        </Link>
      </div>

      {/* Scrollable Row with arrows */}
      <div className="relative group">
        {/* Prev */}
        <Button
          onClick={scrollLeft}
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex rounded-full shadow"
        >
          <ChevronLeft />
        </Button>

        <div
          id="supplier-scroll"
          className="
            flex gap-4 overflow-x-auto scrollbar-hide pb-2 scroll-smooth
          "
        >
          {products.map((product) => (
            <div
              key={product.slug}
              className="
                flex-shrink-0
                w-[40%] sm:w-[33%] md:w-[29%] lg:w-[25%]
              "
            >
              <ProductCard
                id={product.id}
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

        {/* Next */}
        <Button
          onClick={scrollRight}
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex rounded-full shadow"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
