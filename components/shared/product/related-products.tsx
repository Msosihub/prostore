"use client";

import { useEffect, useState } from "react";
import { getProductsByCategory } from "@/lib/actions/product.actions";
import ProductCard from "./product-card2";
import { Skeleton } from "@/components/ui/skeleton";
// import { convertToPlainObject } from "@/lib/utils";
import { Product } from "@/types";

const RelatedProducts = ({
  categoryId,
  excludeSlug,
}: {
  categoryId: string;
  excludeSlug: string;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      setLoading(true);
      const data = await getProductsByCategory(categoryId, excludeSlug);
      //const filtered = data.filter((p: any) => p.slug !== excludeSlug);
      setProducts(data.slice(0, 12)); // Limit to 12 products
      setLoading(false);
    };
    fetchRelated();
  }, [categoryId, excludeSlug]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <p className="text-sm text-muted">No related products found.</p>;
  }
  // console.log("Related Products:", products);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 w-full">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={{
            ...product,
            brand: product.brand?.name ?? "",
            category: product.category?.name_en ?? "",
            subcategory: product.subcategory?.name_en ?? "",
            supplier: product.supplier?.companyName ?? "",
            price: Number(product.price),
            stock: Number(product.stock),
            pricingTiers: product.pricingTiers,
          }}
        />
      ))}
    </div>
  );
};

export default RelatedProducts;
