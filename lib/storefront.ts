import "server-only";
import { prisma } from "@/db/prisma";
import { cache } from "react";
export const publicProductWhere = {
  supplier: {
    OR: [
      { registration: null },
      { registration: { state: "APPROVED" }, isVerified: true },
    ],
  },
  name: { not: "" },
  slug: { not: "" },
  price: { gt: 0 },
};
export const storefrontProductSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  stock: true,
  images: true,
  isFeatured: true,
  pricingTiers: {
    orderBy: { minQty: "asc" as const },
    select: { minQty: true, price: true },
  },
  brand: { select: { name: true } },
  category: { select: { name_sw: true, name_en: true } },
  subcategory: { select: { name_sw: true, name_en: true } },
  supplier: {
    select: { id: true, name: true, companyName: true, isVerified: true },
  },
};
export const storefrontCategories = cache(async () =>
  prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name_en: "asc" }],
    select: {
      id: true,
      name_en: true,
      name_sw: true,
      image: true,
      description: true,
      _count: { select: { products: { where: publicProductWhere } } },
    },
  }),
);
export const storefrontHome = cache(async () => {
  const [latest, featured, categories, sellers] = await Promise.all([
    prisma.product.findMany({
      where: publicProductWhere,
      select: storefrontProductSelect,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 8,
    }),
    prisma.product.findMany({
      where: { ...publicProductWhere, isFeatured: true },
      select: storefrontProductSelect,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 4,
    }),
    storefrontCategories(),
    prisma.supplier.findMany({
      where: { products: { some: publicProductWhere } },
      take: 4,
      orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        companyName: true,
        isVerified: true,
        location: true,
        _count: { select: { products: { where: publicProductWhere } } },
      },
    }),
  ]);
  return { latest, featured, categories, sellers };
});
export type StorefrontProduct = Awaited<
  ReturnType<typeof storefrontHome>
>["latest"][number];
