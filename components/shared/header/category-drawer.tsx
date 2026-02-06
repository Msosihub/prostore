"use client";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  // DrawerTrigger,
} from "@/components/ui/drawer";
// import { Loader, MenuIcon } from "lucide-react";
import Link from "next/link";
// import { useEffect, useState } from "react";
import useSWR from "swr";
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
  if (!res) throw new Error("Failed to fetch");
  return res.json();
};

const CategoryDrawer = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (val: boolean) => void;
}) => {
  const {
    data: categories,
    error,
    isLoading,
  } = useSWR<Category[]>("/api/shared/categories", fetcher);

  // useEffect(() => {
  //   const toggle = document.getElementById(
  //     "category-drawer-toggle"
  //   ) as HTMLInputElement;
  //   if (!toggle) return;

  //   const observer = () => setOpen(toggle.checked);
  //   toggle.addEventListener("change", observer);
  //   return () => toggle.removeEventListener("change", observer);
  // }, []);

  if (isLoading) return null;

  if (error || !Array.isArray(categories)) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      {/* <DrawerTrigger asChild>
        <Button variant="outline">
          <MenuIcon />
        </Button>
      </DrawerTrigger> */}
      <DrawerContent className=" h-[90vh] w-full rounded-t-xl overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Chagua kundi</DrawerTitle>
          <div className="space-y-1 mt-4">
            {categories &&
              categories?.map((x) => (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  key={x.id}
                  asChild
                >
                  <DrawerClose asChild>
                    <Link href={`/search?category=${x.name_en}`}>
                      {x.name_en} ({x._count.products})
                    </Link>
                  </DrawerClose>
                </Button>
              ))}
          </div>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  );
};

export default CategoryDrawer;
