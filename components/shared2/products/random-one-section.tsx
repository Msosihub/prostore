"use client";
//Zinaonyesha bidhaa kwa horizontally za category moja tuu, infinity, no heading,
import { useEffect, useState } from "react";
import { Product } from "@/types";
import SectionSkeleton from "@/components/skeletons/skeleton-section";
import ProductList from "@/components/shared/product/product-list";

type Props = {
  locale: "en" | "sw";
};

export default function RandomOneSection({ locale }: Props) {
  const [data, setData] = useState<Product[] | null>(null);
  const [catName, setCatName] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/products/random_one");
      const json = await res.json();
      setData(json.products);
      setCatName(
        locale === "en" ? json.category?.name_en : json.category?.name_sw
      );
    }
    fetchData();
  }, [locale]);

  if (!data) return <SectionSkeleton />;

  return (
    <ProductList
      data={data}
      title={`Discover in ${catName}`}
      limit={8}
      locale={locale}
      variant="scroll" // 👈 horizontal scroll view
    />
  );
}
