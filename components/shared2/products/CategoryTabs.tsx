// components/shared2/products/CategoryTabs.tsx
"use client";

import { CategorySummary } from "@/types";

type CategoryTabsProps = {
  categories: CategorySummary[]; // Must be an array
  activeId: string | null;
  onSelect: (id: string) => void; // This is the type you asked for
  locale: string;
};

export default function CategoryTabs({
  categories,
  activeId,
  onSelect,
  locale,
}: CategoryTabsProps) {
  return (
    <div className="sticky z-40 bg-white border-b overflow-x-auto no-scrollbar">
      {/* top-[120px] md:top-[144px]  */}
      <div className="flex px-4 gap-6">
        {categories.map((cat: CategorySummary) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`relative py-4 text-sm font-bold whitespace-nowrap transition-all ${
              activeId === cat.id
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {locale === "en" ? cat.name_en : cat.name_sw}
            {/* Professional Count Badge */}
            <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
              {cat._count?.products || 0}
            </span>
            {/* Active Indicator */}
            {activeId === cat.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
