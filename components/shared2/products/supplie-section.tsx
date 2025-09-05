// components/shared2/products/supplier-section.tsx
"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/shared/product/product-card";

type Product = any;

export default function SupplierSection({
  supplier,
  products,
}: {
  supplier: any;
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
    <div className="my-10 space-y-3 rounded-sm">
      <div className="p-2 rounded-sm sm:p-2 flex flex-row justify-between gap-1 sm:gap-2 text-xs sm:text-sm bg-blue-50">
        <div className="flex items-center gap-2">
          <div className="p-0">
            <Image
              src={supplier.logo || "/images/logo.svg"}
              alt="Logo"
              width={55}
              height={55}
              className="rounded-sm object-cover"
              priority
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start gap-1">
              <Link
                href={`/company/${supplier.id}/home`}
                className="font-bold underline  text-sm sm:text-base md:text-lg line-clamp-2"
              >
                {supplier.companyName}
              </Link>

              <div className="text-[11px] sm:text-xs md:text-sm text-muted-foreground">
                <Badge
                  variant="outline"
                  className="text-blue-600 px-2 bg-blue-50"
                >
                  Verified Supplier
                </Badge>
                • {"Multispecialty Supplier"}
                <div className={"pl-0"}>
                  • {supplier.yearsActive}+ yrs on Prostore • {supplier.nation}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Link
          href={`/company/${supplier.id}/home`}
          className="flex items-center gap-1 text-blue-600 hover:underline ml-4"
        >
          <span>See all</span>
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
          {products.map((product: any) => (
            <div
              key={product.slug || product.id}
              className="flex-shrink-0 w-[40%] sm:w-[33%] md:w-[29%] lg:w-[25%]"
            >
              <ProductCard
                id={product.id}
                slug={product.id}
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
