import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma"; // adjust if your prisma client is in a different path

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const supplierId = searchParams.get("supplierId");
  if (!supplierId) {
    return NextResponse.json({ error: "Missing supplierId" }, { status: 400 });
  }

  try {
    // Find all categories where this supplier has products
    const categories = await prisma.category.findMany({
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
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching categories with products:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories with products" },
      { status: 500 }
    );
  }
}
