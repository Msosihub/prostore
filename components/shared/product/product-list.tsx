"use client";

import { Product } from "@/types";
import ProductCard from "./product-card";
import ProductCardNoText from "./product-card-notext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

type ProductListProps = {
  data: Product[];
  title?: string;
  limit?: number;
  locale: "en" | "sw";
  variant?: "grid" | "scroll";
  notext?: boolean;
};

const ProductList = ({
  data,
  title,
  limit,
  variant = "grid",
  notext = false,
}: ProductListProps) => {
  const limitedData = limit ? data.slice(0, limit) : data;
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
    <div className="w-full relative my-4">
      {title && (
        <h2 className="text-sm font-bold md:text-lg text-slate-900 tracking-tight mb-3 px-1">
          {title}
        </h2>
      )}

      {limitedData.length > 0 ? (
        variant === "grid" ? (
          // 🔲 GRID LAYOUT: Crisp 2-column format on phones, scalable up to 4 on widescreen
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
            {limitedData.map((product) =>
              notext ? (
                <ProductCardNoText
                  key={product.id}
                  id={product.slug}
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
                    // product?.supplier?.name ||
                    "Muuzaji"
                  }
                  images={product.images}
                  price={Number(product.price)}
                  stock={product.stock}
                  pricingTiers={product.pricingTiers}
                />
              ) : (
                <ProductCard
                  key={product.id}
                  id={product.slug}
                  slug={product.slug}
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
                    // product?.supplier?.name ||
                    "Muuzaji"
                  }
                  images={product.images}
                  price={Number(product.price)}
                  stock={product.stock}
                  pricingTiers={product.pricingTiers}
                />
              )
            )}
          </div>
        ) : (
          // 👉 HORIZONTAL SCROLL LAYOUT
          <div className="relative group/scroll w-full">
            <button
              onClick={() => scroll("left")}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur p-2 shadow-md rounded-full z-20 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center hover:bg-white border border-slate-100"
            >
              <ChevronLeft size={18} className="text-slate-700" />
            </button>

            <div
              ref={scrollRef}
              className="flex gap-2.5 md:gap-4 overflow-x-auto no-scrollbar pb-3 scroll-smooth snap-x snap-mandatory"
            >
              {limitedData.map((product) => (
                <div
                  key={product.id}
                  className="w-[46%] sm:w-[30%] md:w-[23%] lg:w-[22%] shrink-0 snap-start"
                >
                  {notext ? (
                    <ProductCardNoText
                      id={product.slug}
                      name={product.name}
                      brand={product?.brand?.name || ""}
                      category={
                        product.category?.name_sw ||
                        product.category?.name_en ||
                        ""
                      }
                      subcategory={
                        product?.subcategory?.name_sw ||
                        product?.subcategory?.name_en ||
                        ""
                      }
                      supplier={
                        product?.supplier?.companyName ||
                        // product?.supplier?.name ||
                        "Muuzaji"
                      }
                      images={product.images}
                      price={Number(product.price)}
                      stock={product.stock}
                      pricingTiers={product.pricingTiers}
                    />
                  ) : (
                    <ProductCard
                      id={product.slug}
                      name={product.name}
                      slug={product.slug}
                      brand={product?.brand?.name || ""}
                      category={
                        product.category?.name_sw ||
                        product.category?.name_en ||
                        ""
                      }
                      subcategory={
                        product?.subcategory?.name_sw ||
                        product?.subcategory?.name_en ||
                        ""
                      }
                      supplier={
                        product?.supplier?.companyName ||
                        // product?.supplier?.name ||
                        "Muuzaji"
                      }
                      images={product.images}
                      price={Number(product.price)}
                      stock={product.stock}
                      pricingTiers={product.pricingTiers}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => scroll("right")}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur p-2 shadow-md rounded-full z-20 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center hover:bg-white border border-slate-100"
            >
              <ChevronRight size={18} className="text-slate-700" />
            </button>
          </div>
        )
      ) : (
        <div className="text-center py-8 border border-dashed rounded-xl bg-slate-50/50">
          <p className="text-xs text-muted-foreground">
            Hakuna bidhaa zilizopatikana.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductList;
