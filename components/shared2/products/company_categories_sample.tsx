"use client";
//Infinite Random Sections Component ih grid if varient='grid'
import { useEffect, useState } from "react";
import { Product } from "@/types";
import ProductList from "@/components/shared/product/product-list";
import SectionSkeleton from "@/components/skeletons/skeleton-section";

type Section = {
  id: string;
  name_en: string;
  name_sw: string;
  category: { id: string; name_en: string; name_sw: string };
  products: Product[];
};

type Props = {
  locale: "en" | "sw";
  supplierId: string;
};

export default function CompanyCategoriesProducts({
  locale,
  supplierId,
}: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchSections() {
    setLoading(true);
    const res = await fetch(
      `/api/products/company_categories_with_products?supplierId=${supplierId}&limit=false`
    );
    const json = await res.json();
    setSections(json.categories ?? []); // 👈 directly assign
    setLoading(false);
  }

  // Load once on mount
  useEffect(() => {
    fetchSections();
  }, []);

  return (
    <div>
      {loading && <SectionSkeleton />}

      {Array.isArray(sections) &&
        sections.map((section) => (
          <ProductList
            key={section.id}
            data={section.products}
            title={`Discover in ${
              locale === "en" ? section.name_en : section.name_sw
            }`}
            limit={6}
            locale={locale}
            variant="scroll"
          />
        ))}
    </div>
  );
}
