"use client";
//Infinite Random Sections Component ih grid if varient='grid'
import { useEffect, useState } from "react";
import { Product } from "@/types";
import ProductList from "@/components/shared/product/product-list";
import SectionSkeleton from "@/components/skeletons/skeleton-section";

type Section = {
  category: { id: string; name_en: string; name_sw: string };
  products: Product[];
};

type Props = {
  locale: "en" | "sw";
};

export default function RandomSections({ locale }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchSections() {
    setLoading(true);
    const res = await fetch(`/api/products/random_2?count=2&take=4`);
    const json = await res.json();
    setSections((prev) => [...prev, ...json.sections]);
    setLoading(false);
  }

  // First load
  useEffect(() => {
    fetchSections();
  }, []);

  // Infinite scroll
  useEffect(() => {
    function handleScroll() {
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 300
      ) {
        if (!loading) {
          fetchSections();
        }
      }
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading]);

  return (
    <div>
      {sections.map((section, idx) => (
        <ProductList
          key={section.category.id + "-" + idx}
          data={section.products}
          title={`Discover in ${locale === "en" ? section.category.name_en : section.category.name_sw}`}
          limit={4}
          locale={locale}
          variant="grid"
        />
      ))}
      {loading && <SectionSkeleton />}
    </div>
  );
}
