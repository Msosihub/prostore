import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

//chooses one suplier and his products
let recentlyUsed: string[] = [];
const MAX_MEMORY = 5;

export async function GET() {
  let suppliers = [];
  try {
    suppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        companyName: true,
        logo: true,
        nation: true,
        deliveryRate: true,
        yearsActive: true,
        isVerified: true,
      },
    });
  } catch (error) {
    return NextResponse.json({ error });
  }

  if (suppliers.length === 0) {
    return NextResponse.json({ supplier: null, products: [] });
  }

  // Avoid recent picks
  let available = suppliers.filter((s) => !recentlyUsed.includes(s.id));
  if (available.length === 0) {
    recentlyUsed = [];
    available = suppliers;
  }

  const sup = available[Math.floor(Math.random() * available.length)];

  recentlyUsed.unshift(sup.id);
  if (recentlyUsed.length > MAX_MEMORY) recentlyUsed.pop();

  let products = [];
  try {
    products = await prisma.product.findMany({
      where: { supplierId: sup.id },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        brand: { select: { name: true } },
        category: { select: { name_en: true, name_sw: true } },
        subcategory: { select: { name_en: true, name_sw: true } },
        supplier: { select: { companyName: true } },
        pricingTiers: { orderBy: { minQty: "asc" } },
      },
    });
  } catch (error) {
    return NextResponse.json({ error });
  }

  return NextResponse.json({ supplier: sup, products });
}
