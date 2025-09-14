// random products fron 2 categories

import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";

export const revalidate = 30;

export async function GET() {
  // Pick random categories first
  let categories = [];
  let randomCats = [];
  try {
    categories = await prisma.category.findMany({
      select: { id: true, name_en: true, name_sw: true },
    });

    if (categories.length === 0) {
      return NextResponse.json({ products: [] });
    }
    // Pick 1–2 random categories
    randomCats = categories.sort(() => 0.5 - Math.random()).slice(0, 2);
    // console.log("Categories Picked: ", randomCats);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ products: [] });
  }

  // Fetch products for those categories
  let products = [];
  //try catch
  try {
    products = await prisma.product.findMany({
      where: {
        categoryId: { in: randomCats.map((c) => c.id) },
      },
      take: 8,
      include: {
        brand: { select: { name: true } },
        category: { select: { name_en: true, name_sw: true } },
        subcategory: { select: { name_en: true, name_sw: true } },
        supplier: { select: { companyName: true } },
        pricingTiers: {
          orderBy: { minQty: "asc" },
        },
      },
    });
    console.log("Products fetched: ", products.length);
  } catch (error) {
    console.error("Error fetching random products:", error);
    return NextResponse.json({ products: [] });
  }

  return NextResponse.json({ products });
}
