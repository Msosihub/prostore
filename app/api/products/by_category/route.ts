import {
  visibleCatalogProduct,
  publicSupplierSelect,
} from "@/lib/catalog-visibility";
// API B: /api/products/by_category/route.ts
// Goal: Get 20 products at a time for a specific category.

import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const parsedPage = Number(searchParams.get("page") || 1);
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0
      ? Math.min(parsedPage, 10000)
      : 1;
  const limit = 12; // 12 is good for grid layout (divisible by 2, 3, 4)
  const skip = (page - 1) * limit;

  const products = await prisma.product.findMany({
    where: { ...visibleCatalogProduct, supplierId, categoryId },
    take: limit,
    skip: skip,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: publicSupplierSelect },
      category: true,
      pricingTiers: true,
    },
  });

  return NextResponse.json({ products });
}
