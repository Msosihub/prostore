"use client";

import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Category } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CategoriesPage() {
  const {
    data: categories,
    error,
    isLoading,
  } = useSWR("/api/shared/categories", fetcher, { revalidateOnFocus: true });

  if (error) return <div className="p-4">Failed to load categories.</div>;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-xl font-semibold mb-4">All Categories</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="rounded-xl shadow-sm">
              <Skeleton className="h-24 w-full rounded-t-xl" />
              <CardContent className="p-2">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories?.map((cat: Category) => (
            <Link href={`/categories/${cat.id}`} key={cat.id}>
              <Card className="rounded-xl shadow-sm hover:shadow-md transition">
                <div className="relative h-24 w-full overflow-hidden rounded-t-xl">
                  <Image
                    src={cat.image || "/images/logo.svg"}
                    alt={cat.name_en}
                    fill
                    className="object-cover"
                  />
                  )
                </div>
                <CardContent className="p-2 text-center">
                  <p className="text-sm font-medium truncate">{cat.name_en}</p>
                  <p className="text-xs text-gray-500">
                    {cat._count?.products ?? 0} products
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
