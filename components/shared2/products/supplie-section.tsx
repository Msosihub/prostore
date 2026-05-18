"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
// import { Button } from "@/components/ui/button";
import ProductCard from "@/components/shared/product/product-card";
import { Product, Supplier } from "@/types";
import SupplierHeader from "./supplier-section-header";
import { useRef } from "react";

export default function SupplierSection({
  supplier,
  products,
}: {
  supplier: Supplier;
  products: Product[];
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full space-y-3 py-2 border-b border-slate-100 last:border-0 pb-6">
      {/* 🟢 Flat clean header wrapper layout (Removed bg boxes, grey banners, and fixed shadow boundaries) */}
      <div className="flex items-center justify-between px-1">
        <SupplierHeader supplier={supplier} />

        <Link
          href={`/company/${supplier.id}/home`}
          className="flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
        >
          <span>Ona Duka</span>
          <ChevronRight size={14} className="mt-0.5" />
        </Link>
      </div>

      {/* Product Scroller Viewport Area */}
      <div className="relative group/supplier w-full">
        {/* Navigation Left Arrow Controller (Desktop only) */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur p-2 shadow-md rounded-full z-20 opacity-0 group-hover/supplier:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center hover:bg-white border border-slate-100"
        >
          <ChevronLeft size={18} className="text-slate-700" />
        </button>

        {/* 🟢 Optimized row wrapper width layout + hides ugly browser layout bars */}
        <div
          ref={scrollRef}
          className="flex gap-2.5 md:gap-4 overflow-x-auto no-scrollbar pb-1 scroll-smooth snap-x snap-mandatory"
        >
          {products.map((product: Product) => (
            <div
              key={product.slug || product.id}
              className="w-[46%] sm:w-[30%] md:w-[23%] lg:w-[22%] shrink-0 snap-start"
            >
              <ProductCard
                id={product.id}
                name={product.name}
                brand={product?.brand?.name || ""}
                category={
                  product.category?.name_sw || product.category?.name_en || ""
                }
                subcategory={
                  product?.subcategory?.name_sw ||
                  product?.subcategory?.name_en ||
                  ""
                }
                supplier={
                  product?.supplier?.companyName ||
                  supplier.companyName ||
                  "Muuzaji"
                }
                images={product.images}
                price={Number(product.price)}
                stock={product.stock}
                pricingTiers={product.pricingTiers}
              />
            </div>
          ))}
        </div>

        {/* Navigation Right Arrow Controller (Desktop only) */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur p-2 shadow-md rounded-full z-20 opacity-0 group-hover/supplier:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center hover:bg-white border border-slate-100"
        >
          <ChevronRight size={18} className="text-slate-700" />
        </button>
      </div>
    </div>
  );
}
