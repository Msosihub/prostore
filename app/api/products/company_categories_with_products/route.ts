import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma"; // adjust if your prisma client is in a different path

export const revalidate = 120;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const supplierId = searchParams.get("supplierId");
  const productLimit: boolean = searchParams.get("limit") === "false";
  if (!supplierId) {
    return NextResponse.json({ error: "Missing supplierId" }, { status: 400 });
  }

  if (productLimit) {
  }
  try {
    let categories;
    if (productLimit) {
      categories = await prisma.category.findMany({
        where: {
          products: {
            some: {
              supplierId,
            },
          },
        },
        include: {
          products: {
            where: { supplierId },
            // take: 6, // max 6 per category
            orderBy: { createdAt: "desc" }, // latest products
            include: {
              supplier: true,
              brand: true,
              category: true,
              pricingTiers: true,
              subcategory: true,
            },
          },
        },
      });
    } else {
      // Find all categories where this supplier has products
      categories = await prisma.category.findMany({
        where: {
          products: {
            some: {
              supplierId,
            },
          },
        },
        include: {
          products: {
            where: { supplierId },
            take: 6, // max 6 per category
            orderBy: { createdAt: "desc" }, // latest products
            include: {
              supplier: true,
              brand: true,
              category: true,
              pricingTiers: true,
              subcategory: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching categories with products:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories with products" },
      { status: 500 }
    );
  }
}
