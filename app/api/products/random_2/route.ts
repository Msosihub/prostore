//random products from random categories

import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export const revalidate = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const batchSize = Number(searchParams.get("count") || 2); // how many random categories per call
  const productsPerCat = Number(searchParams.get("take") || 4);

  // Pick random categories
  let categories = [];
  try {
    categories = await prisma.category.findMany({
      select: { id: true, name_en: true, name_sw: true },
    });

    if (categories.length === 0) {
      return NextResponse.json({ sections: [] });
    }
  } catch (error) {
    console.log("Error fetching Categories in route: ");
    return NextResponse.json({ error });
  }

  const randomCats = categories
    .sort(() => 0.5 - Math.random())
    .slice(0, batchSize);

  // Fetch products for each category
  const sections = await Promise.all(
    randomCats.map(async (cat) => {
      let products;
      try {
        products = await prisma.product.findMany({
          where: { categoryId: cat.id },
          take: productsPerCat,
          orderBy: { createdAt: "desc" },
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
      } catch (error) {
        return NextResponse.json({ error });
      }

      return {
        category: cat,
        products,
      };
    })
  );

  return NextResponse.json({ sections });
}
