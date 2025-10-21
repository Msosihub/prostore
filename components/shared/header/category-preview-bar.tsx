"use client";
// import { useState } from "react";
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
  //   const [drawerOpen, setDrawerOpen] = useState(false);

  if (!categories) return null;

  const previewCategories = categories.slice(0, 6); // show first 6

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0">
      {previewCategories.map((cat) => (
        <Link
          key={cat.id}
          href={`/search?category=${encodeURIComponent(cat.name_en)}`}
          className="text-sm px-3 py-1 rounded-full bg-orange-100 hover:bg-orange-200 whitespace-nowrap"
        >
          {cat.name_en}
        </Link>
      ))}

      {/* Trigger drawer */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenDrawer}
        className="flex items-center gap-1 text-sm"
      >
        <ChevronDown size={16} />
        Zaidi
      </Button>

      {/* Hidden drawer trigger */}
      {/* <input
        type="checkbox"
        checked={drawerOpen}
        onChange={() => setDrawerOpen(!drawerOpen)}
        className="hidden"
        id="category-drawer-toggle"
      /> */}
    </div>
  );
}
