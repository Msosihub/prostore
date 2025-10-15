// components/shared2/products/supplier-section.tsx
"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/shared/product/product-card";
import { Product, Supplier } from "@/types";
import SupplierHeader from "./supplier-section-header";

export default function SupplierSection({
  supplier,
  products,
}: {
  supplier: Supplier;
  products: Product[];
}) {
  const scrollLeft = () => {
    const scroller = document.getElementById(`supplier-scroll-${supplier.id}`);
    scroller?.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    const scroller = document.getElementById(`supplier-scroll-${supplier.id}`);
    scroller?.scrollBy({ left: 300, behavior: "smooth" });
  };

  return (
    <div className="my-10 space-y-3 rounded-sm shadow-md ">
      <div className="p-2  flex flex-row justify-between gap-1 sm:gap-2 text-xs sm:text-sm bg-gray-100">
        <SupplierHeader supplier={supplier} />
        <Link
          href={`/company/${supplier.id}/home`}
          className="flex items-center gap-1 text-blue-600 hover:underline ml-4"
        >
          {/* <span>Ona zaidi</span> */}
          <ChevronRight size={20} />
        </Link>
      </div>

      <div className="relative group">
        <Button
          onClick={scrollLeft}
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex rounded-full shadow"
        >
          <ChevronLeft />
        </Button>

        <div
          id={`supplier-scroll-${supplier.id}`}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 scroll-smooth"
        >
          {products.map((product: Product) => (
            <div
              key={product.slug || product.id}
              className="flex-shrink-0 w-[40%] sm:w-[33%] md:w-[29%] lg:w-[25%]"
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
