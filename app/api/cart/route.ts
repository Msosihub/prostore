import { NextResponse } from "next/server";
import { getMyCart } from "@/lib/actions/cart.actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await getMyCart();
    if (!res) {
      return NextResponse.json({ message: "Cart not found" }, { status: 404 });
    }
    return NextResponse.json(res);
  } catch (error) {
    console.log("Error fetching Cart: ", error);
    return NextResponse.json(error);
  }
}
