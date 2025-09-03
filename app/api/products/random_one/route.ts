//API Route for “One Random Category (no repeats soon)”
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

let recentlyUsed: string[] = []; // category IDs we used recently
const MAX_MEMORY = 5; // don't repeat last 5

export async function GET() {
  let categories = [];
  try {
    categories = await prisma.category.findMany({
      select: { id: true, name_en: true, name_sw: true, description: true },
    });
  } catch (error) {
    return NextResponse.json({ error });
  }

  if (categories.length === 0) {
    return NextResponse.json({ category: null, products: [] });
  }

  // Filter out recently used
  let available = categories.filter((c) => !recentlyUsed.includes(c.id));
  if (available.length === 0) {
    // reset memory if exhausted
    recentlyUsed = [];
    available = categories;
  }

  // Pick one random
  const cat = available[Math.floor(Math.random() * available.length)];

  // Save to memory
  recentlyUsed.unshift(cat.id);
  if (recentlyUsed.length > MAX_MEMORY) recentlyUsed.pop();

  // Fetch products
  let products = [];
  try {
    products = await prisma.product.findMany({
      where: { categoryId: cat.id },
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

  return NextResponse.json({ category: cat, products });
}
