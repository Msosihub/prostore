import PublicShop, { shopMetadata } from "@/components/sellers/public-shop";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  return shopMetadata((await params).slug, false, await searchParams);
}
export default async function Shop({ params, searchParams }: Props) {
  return (
    <PublicShop shopKey={(await params).slug} query={await searchParams} />
  );
}
