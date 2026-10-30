import { notFound, redirect } from "next/navigation";
import PublicShop, { shopMetadata } from "@/components/sellers/public-shop";
import { getPublicShop } from "@/lib/public-shop";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ supplierId: string }>;
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  return shopMetadata((await params).supplierId, true, await searchParams);
}
export default async function Shop({ params, searchParams }: Props) {
  const id = (await params).supplierId;
  const shop = await getPublicShop(id, true);
  if (!shop) notFound();
  const query = await searchParams;
  if (shop.path.startsWith("/shops/")) {
    const q = new URLSearchParams(
      Object.entries(query).filter(([, v]) => typeof v === "string") as [
        string,
        string,
      ][],
    ).toString();
    redirect(shop.path + (q ? `?${q}` : ""));
  }
  return <PublicShop shopKey={id} byId query={query} />;
}
