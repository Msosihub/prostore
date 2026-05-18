"use client";

import { ChevronDown } from "lucide-react";
import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Category = {
  id: string;
  name_en: string;
  name_sw: string;
  _count: { products: number };
};

const fetcher = async (url: string): Promise<Category[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export default function CategoryPreviewBar({
  onOpenDrawer,
}: {
  onOpenDrawer: () => void;
}) {
  const { data: categories } = useSWR<Category[]>(
    "/api/shared/categories",
    fetcher
  );

  if (!Array.isArray(categories)) return null;

  // Show the first 6 categories as fast action access buttons
  const previewCategories = categories.slice(0, 6);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 pt-0.5 w-full">
      {previewCategories.map((cat) => (
        <Link
          key={cat.id}
          href={`/search?category=${encodeURIComponent(cat.name_en)}`}
          className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-orange-100 hover:text-orange-700 transition-colors whitespace-nowrap"
        >
          {cat.name_sw || cat.name_en}{" "}
          {/* 🟢 Natively switches to Swahili text display */}
        </Link>
      ))}

      {/* Trigger drawer */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenDrawer}
        className="flex items-center gap-1 text-xs text-slate-600 hover:text-orange-600 font-medium shrink-0 h-7 px-2 rounded-full"
      >
        <ChevronDown size={14} />
        Zaidi
      </Button>
    </div>
  );
}
