import { notFound, redirect } from "next/navigation";
import { prisma } from "@/db/prisma";
import { getPublicShop } from "@/lib/public-shop";
import { productSlugFromParam } from "@/lib/storefront-seo";
export default async function LegacyShop({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const name = productSlugFromParam((await params).username);
  if (!name || name.length > 200) notFound();
  const match = await prisma.supplier.findUnique({
    where: { username: name },
    select: { id: true },
  });
  if (!match) notFound();
  const shop = await getPublicShop(match.id, true);
  if (!shop) notFound();
  redirect(shop.path);
}
