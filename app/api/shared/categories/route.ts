import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/actions/product.actions";

// export const revalidate = 3600; // ISR: refresh every 10s

export async function GET() {
  try {
    const res = await getAllCategories();
    if (!res) return NextResponse.json({ message: "error undefined" });
    return NextResponse.json(res);
  } catch (error) {
    console.log("Error fetching categories: ", error);
    return NextResponse.json(error);
  }
}
