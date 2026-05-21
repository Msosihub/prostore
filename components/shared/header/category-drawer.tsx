"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import useSWR from "swr";
import { Grid, ChevronRight, Loader2 } from "lucide-react";

type Category = {
  id: string;
  name_en: string;
  name_sw: string;
  _count: {
    products: number;
  };
};

const fetcher = async (url: string): Promise<Category[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

interface CategoryDrawerProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
}

export default function CategoryDrawer({
  open,
  onOpenChange,
}: CategoryDrawerProps) {
  const {
    data: categories,
    error,
    isLoading,
  } = useSWR<Category[]>("/api/shared/categories", fetcher);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="h-[85vh] md:h-[70vh] max-w-lg mx-auto bg-white border border-slate-100 rounded-t-2xl shadow-2xl flex flex-col outline-none">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />

        <DrawerHeader className="px-4 pb-3 border-b border-slate-50 text-left">
          <DrawerTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <Grid className="w-4 h-4 text-orange-500" />
            Chagua Makundi ya Bidhaa
          </DrawerTitle>
        </DrawerHeader>

        {/* Scrollable grid area context workspace */}
        <div className="flex-1 overflow-y-auto px-2 py-2 no-scrollbar">
          {isLoading && (
            <div className="w-full flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          )}

          {error && (
            <p className="text-xs text-center text-rose-500 py-4 font-medium">
              Imeshindikana kusoma makundi kwa sasa.
            </p>
          )}

          <div className="space-y-1">
            {Array.isArray(categories) &&
              categories.map((x) => (
                <Button
                  key={x.id}
                  variant="ghost"
                  className="w-full h-11 justify-between rounded-xl px-3 text-slate-700 hover:bg-orange-50/50 hover:text-orange-600 transition-colors group"
                  asChild
                >
                  <DrawerClose asChild>
                    <Link
                      href={`/search?category=${encodeURIComponent(x.name_en)}`}
                      className="flex items-center w-full"
                    >
                      <span className="text-xs font-semibold tracking-wide">
                        {x.name_sw || x.name_en}{" "}
                        {/* 🟢 Swahili Localization Shift */}
                      </span>
                      <div className="flex items-center gap-1.5 ml-auto text-slate-400 group-hover:text-orange-500">
                        <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded-full text-slate-400 font-bold border border-slate-200/40 group-hover:bg-orange-100 group-hover:text-orange-600 group-hover:border-orange-200/50">
                          {x._count.products} pcs
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  </DrawerClose>
                </Button>
              ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
