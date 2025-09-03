// app/api/categories/[id]/products/route.ts

import { NextResponse } from "next/server";
import { getProductsByCategoryID } from "@/lib/actions/product.actions";

export const revalidate = 10; // ISR

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ✅ unwrap async params

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    const res = await getProductsByCategoryID(id, page, limit);
    return NextResponse.json(res);
  } catch (error) {
    console.error("Error fetching category products: ", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
