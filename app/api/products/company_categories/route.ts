// API A: /api/products/company_categories/route.ts
// Goal: Just get the list of categories this supplier uses.

import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");

  if (!supplierId)
    return NextResponse.json({ error: "No supplierId" }, { status: 400 });

  const categories = await prisma.category.findMany({
    where: { products: { some: { supplierId } } },
    select: {
      id: true,
      name_en: true,
      name_sw: true,
      _count: {
        select: { products: { where: { supplierId } } },
      },
    },
  });

  return NextResponse.json({ categories });
}
