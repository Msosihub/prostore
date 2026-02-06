// app/api/suppliers/scroll/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

function shuffleArray<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const takeParam = Number(url.searchParams.get("take") ?? "3"); // default 3 suppliers per batch
    const take = Math.min(Math.max(1, takeParam), 12); // clamp between 1 and 12

    const excludeParam = url.searchParams.get("exclude") ?? "";
    const exclude = excludeParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // 1) fetch suppliers (lightweight fields)
    let suppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        companyName: true,
        logo: true,
        nation: true,
        deliveryRate: true,
        yearsActive: true,
        isVerified: true,
      },
      where: { isVerified: true },
    });
    // console.log("suppliers fetched: ", suppliers);

    // Filter excluded
    if (exclude.length) {
      suppliers = suppliers.filter((s) => !exclude.includes(s.id));
    }

    // If after filtering there's none left, return empty array (client can decide what to do)
    if (suppliers.length === 0) {
      return NextResponse.json({ suppliers: [] });
    }

    // Shuffle and take `take` suppliers
    suppliers = shuffleArray(suppliers).slice(0, take);

    // For each supplier, fetch a limited number of products
    const supplierResults = await Promise.all(
      suppliers.map(async (sup) => {
        const total = await prisma.product.count({
          where: { supplierId: sup.id },
        });

        const take = 8;
        const maxSkip = Math.max(0, total - take);
        const skip = Math.floor(Math.random() * (maxSkip + 1));

        const products = await prisma.product.findMany({
          where: { supplierId: sup.id },
          skip,
          take,
          include: {
            brand: { select: { name: true } },
            category: { select: { name_en: true, name_sw: true } },
            subcategory: { select: { name_en: true, name_sw: true } },
            supplier: { select: { companyName: true } },
            pricingTiers: { orderBy: { minQty: "asc" } },
          },
        });

        return { supplier: sup, products };
      })
    );

    return NextResponse.json({ suppliers: supplierResults });
  } catch (error) {
    console.error("scroll suppliers error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
