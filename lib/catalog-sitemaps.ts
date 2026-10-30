import "server-only";
import { shopPath } from "@/lib/seller-registration-policy";
import { prisma } from "@/db/prisma";
import { publicProductWhere } from "@/lib/storefront";
import { publicUrl, productPath, xmlEscape } from "@/lib/storefront-seo";
export const SITEMAP_SIZE = 10000;
export const sitemapKinds = ["products", "categories", "sellers"] as const;
export type SitemapKind = (typeof sitemapKinds)[number];
const categoryWhere = { products: { some: publicProductWhere } };
const sellerWhere = {
  isVerified: true,
  products: { some: publicProductWhere },
};
export async function sitemapCounts() {
  const [products, categories, sellers] = await Promise.all([
    prisma.product.count({ where: publicProductWhere }),
    prisma.category.count({ where: categoryWhere }),
    prisma.supplier.count({ where: sellerWhere }),
  ]);
  return { products, categories, sellers };
}
export async function sitemapPaths(kind: SitemapKind, page: number) {
  const paging = {
    take: SITEMAP_SIZE,
    skip: (page - 1) * SITEMAP_SIZE,
    orderBy: { id: "asc" as const },
  };
  if (kind === "products")
    return (
      await prisma.product.findMany({
        where: publicProductWhere,
        ...paging,
        select: { slug: true },
      })
    )
      .filter((p) => p.slug.trim())
      .map((p) => productPath(p.slug));
  if (kind === "categories")
    return (
      await prisma.category.findMany({
        where: categoryWhere,
        ...paging,
        select: { id: true },
      })
    ).map((c) => `/categories/${c.id}`);
  return (
    await prisma.supplier.findMany({
      where: sellerWhere,
      ...paging,
      select: { id: true, username: true },
    })
  ).map((s) => shopPath(s.username, s.id));
}
export const sitemapXml = (paths: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${xmlEscape(publicUrl(p))}</loc></url>`).join("")}</urlset>`;
export const sitemapHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
};
