import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/actions/product.actions";

export const revalidate = 10; // ISR: refresh every 10s

export async function GET(req: Request) {
  try {
    const res = await getAllCategories();
    if (!res) return undefined;
    return NextResponse.json(res);
  } catch (error) {
    console.log("Error fetching categories: ", error);
    return null;
  }
}
