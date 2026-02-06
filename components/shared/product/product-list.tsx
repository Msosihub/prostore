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
  variant?: "grid" | "scroll"; // 👈 add this
  notext?: boolean;
};

const ProductList = ({
  data,
  title,
  limit,
  variant = "grid",
  notext,
}: ProductListProps) => {
  const limitedData = limit ? data.slice(0, limit) : data;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 250; // adjust to your liking
    scrollRef.current.scrollBy({
      left: dir === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="my-10 relative">
      {title && (
        <h2 className="my-4 text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-center">
          {title}
        </h2>
      )}
      {limitedData.length > 0 ? (
        variant === "grid" ? (
          // 🔲 GRID layout (like before)
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {limitedData.map((product) => (
              <ProductCard
                key={product.id}
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
            ))}
          </div>
        ) : (
          // 👉 HORIZONTAL SCROLL layout
          <div className="relative">
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-white p-2 shadow rounded-full z-10"
            >
              <ChevronLeft size={20} />
            </button>

            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 scroll-smooth items-center justify-center"
            >
              {limitedData.map((product) => (
                <div
                  key={product.slug}
                  className="w-1/4 flex-shrink-0  sm:w-[25%] md:w-[20%] lg:w-[16.7%]"
                >
                  {notext ? (
                    <ProductCardNoText
                      id={product.id}
                      name={product.name}
                      brand={product?.brand?.name || ""}
                      category={product.category?.name_en ?? ""}
                      subcategory={product?.subcategory?.name_en || ""}
                      supplier={
                        product?.supplier?.companyName ?? "<no supplier>"
                      }
                      images={product.images}
                      price={Number(product.price)}
                      stock={product.stock}
                      pricingTiers={product.pricingTiers}
                    />
                  ) : (
                    <ProductCard
                      id={product.id}
                      name={product.name}
                      brand={product?.brand?.name || ""}
                      category={product.category?.name_en ?? ""}
                      subcategory={product?.subcategory?.name_en || ""}
                      supplier={
                        product?.supplier?.companyName ?? "<no supplier>"
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
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white p-2 shadow rounded-full z-10"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )
      ) : (
        <div>
          <p>No record found</p>
        </div>
      )}
    </div>
  );
};

export default ProductList;
