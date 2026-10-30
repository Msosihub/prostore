import "server-only";
import { cache } from "react";
import { prisma } from "@/db/prisma";
import {
  shopPath,
  safeShopText,
  shopSlug,
} from "@/lib/seller-registration-policy";
import { publicProductWhere, storefrontProductSelect } from "@/lib/storefront";
export const getPublicShop = cache(async (key: string, byId = false) => {
  if (byId ? !/^[0-9a-f-]{36}$/i.test(key) : !shopSlug.safeParse(key).success)
    return null;
  const row = await prisma.supplier.findFirst({
    where: {
      ...(byId ? { id: key } : { username: key }),
      OR: [
        { registration: null },
        { registration: { state: "APPROVED" }, isVerified: true },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      about: true,
      tagLine: true,
      logo: true,
      bannerUrl: true,
      isVerified: true,
    },
  });
  if (!row) return null;
  return {
    ...row,
    name: safeShopText(row.name, "Nimboya seller"),
    about: safeShopText(row.about),
    tagLine: safeShopText(row.tagLine),
    path: shopPath(row.username, row.id),
  };
});
export async function shopCatalog(
  id: string,
  query: { q?: string; category?: string; page?: string },
) {
  const scalar = (v: unknown) =>
    typeof v === "string"
      ? v
      : Array.isArray(v) && typeof v[0] === "string"
        ? v[0]
        : "";
  query = {
    q: scalar(query.q),
    category: scalar(query.category),
    page: scalar(query.page),
  };
  const q = (query.q || "").trim().slice(0, 100);
  const category = /^[0-9a-f-]{36}$/i.test(query.category || "")
    ? query.category
    : undefined;
  const n = Number(query.page || 1);
  const page = Number.isSafeInteger(n) && n > 0 ? Math.min(n, 10000) : 1;
  const where = {
    ...publicProductWhere,
    supplierId: id,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(category ? { categoryId: category } : {}),
  };
  const [products, count, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      select: storefrontProductSelect,
      take: 24,
      skip: (page - 1) * 24,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { products: { some: { ...publicProductWhere, supplierId: id } } },
      select: { id: true, name_en: true, name_sw: true },
      orderBy: { name_en: "asc" },
    }),
  ]);
  return { products, count, categories, page, q, category };
}
// Only the site's configured public image hosts; never fetch arbitrary profile URLs.
export function shopImage(value: string | null) {
  if (!value) return undefined;
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      (u.hostname.endsWith(".ufs.sh") ||
        u.hostname === "utfs.io" ||
        u.hostname === "nimboya.com") &&
      !u.username &&
      !u.password
      ? u.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
