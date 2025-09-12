"use client";

//get random products from 2 different categories (Route.ts decides)
import useSWR from "swr";
import { Product } from "@/types";
import ProductListSkeleton from "@/components/skeletons/skeleton-product-list";
import ProductList from "@/components/shared/product/product-list";
import { Loader } from "lucide-react";

type Props = {
  locale: "en" | "sw";
};

type ProductsResponse = {
  products: Product[];
};

// generic fetcher that always returns JSON
const fetcher = async (url: string): Promise<ProductsResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export default function RandomProducts({ locale }: Props) {
  const { data, error, isLoading } = useSWR<ProductsResponse>(
    "/api/products/random",
    fetcher,
    {
      revalidateOnFocus: true, // refresh when tab refocuses
      // refreshInterval: 30000, //optional: auto-refresh every 30s
    }
  );

  if (isLoading) return <ProductListSkeleton />;
  if (error) return <Loader className="w-4 h-4 animate-spin" />;
  if (!data) return null;

  return (
    <ProductList
      data={data.products as Product[]}
      title="Pata kitu kipya"
      limit={6}
      locale={locale}
      variant="grid"
    />
  );
}
