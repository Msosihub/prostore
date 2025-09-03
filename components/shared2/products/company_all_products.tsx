"use client";
//Zinaonyesha bidhaa kwa horizontally za category moja tuu, infinity, no heading,
import { useEffect, useState } from "react";
import { Product } from "@/types";
import SectionSkeleton from "@/components/skeletons/skeleton-section";
import ProductList from "@/components/shared/product/product-list";

type Props = {
  locale: "en" | "sw";
  supplierId: any;
};

export default function RandomOneSection({ locale, supplierId }: Props) {
  const [data, setData] = useState<Product[] | null>(null);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(
        `/api/products/random_one?supplierId=${supplierId}`
      );
      const json = await res.json();
      setData(json.products);
    }
    fetchData();
  }, [supplierId]);

  if (!data) return <SectionSkeleton />;

  return (
    <ProductList
      data={data}
      title={`Bidhaa zetu`}
      limit={8}
      locale={locale}
      variant="grid" // 👈 vertical scroll view
    />
  );
}
