"use client";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Loader, MenuIcon } from "lucide-react";
import Link from "next/link";
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

const CategoryDrawer = () => {
  const {
    data: categories,
    error,
    isLoading,
  } = useSWR<Category[]>("/api/shared/categories", fetcher);

  if (isLoading) return <Loader className="w-4 h-4 animate-spin" />;

  if (error || !categories) return <Loader className="w-4 h-4 animate-spin" />;

  return (
    <Drawer direction="left">
      <DrawerTrigger asChild>
        <Button variant="outline">
          <MenuIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-full max-w-sm">
        <DrawerHeader>
          <DrawerTitle>Chagua kundi</DrawerTitle>
          <div className="space-y-1 mt-4">
            {categories &&
              categories.map((x) => (
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
