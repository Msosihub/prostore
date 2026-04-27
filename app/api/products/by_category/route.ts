// API B: /api/products/by_category/route.ts
// Goal: Get 20 products at a time for a specific category.

import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const page = Number(searchParams.get("page")) || 1;
  const limit = 12; // 12 is good for grid layout (divisible by 2, 3, 4)
  const skip = (page - 1) * limit;

  const products = await prisma.product.findMany({
    where: { supplierId, categoryId },
    take: limit,
    skip: skip,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: true,
      category: true,
      pricingTiers: true,
    },
  });

  return NextResponse.json({ products });
}
