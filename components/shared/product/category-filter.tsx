"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllCategories } from "@/lib/actions/product.actions";

const CategoryFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<{ name_en: string }[]>([]);

  const activeCategory = searchParams.get("category") || "all";

  useEffect(() => {
    const fetchCategories = async () => {
      const result = await getAllCategories(); // Should return array of { name_en }
      setCategories(result);
    };
    fetchCategories();
  }, []);

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("category");
      params.delete("page");
    } else {
      params.set("category", value);
    }
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Filter by Category</h3>
      <ToggleGroup
        type="single"
        value={activeCategory}
        onValueChange={handleSelect}
        className="flex flex-wrap gap-2"
      >
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        {categories.map((cat) => (
          <ToggleGroupItem key={cat.name_en} value={cat.name_en}>
            {cat.name_en}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

export default CategoryFilter;
