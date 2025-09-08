import { NextResponse } from "next/server";
import { getMyCart } from "@/lib/actions/cart.actions";

export const revalidate = 10; // ISR: refresh every 10s

export async function GET() {
  try {
    const res = await getMyCart();
    if (!res) return undefined;
    return NextResponse.json(res);
  } catch (error) {
    console.log("Error fetching Cart: ", error);
    return NextResponse.json(error);
  }
}
