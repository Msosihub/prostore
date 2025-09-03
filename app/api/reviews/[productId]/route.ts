// app/api/reviews/[productId]/route.ts
import { NextResponse } from "next/server";
import { getReviews } from "@/lib/actions/review.actions";

export const revalidate = 10; // ISR: refresh every 10s

export async function GET(
  req: Request,
  { params }: { params: { productId: string } }
) {
  const paramsx = await params;
  const { productId } = paramsx;
  const res = await getReviews({ productId });
  return NextResponse.json(res.data);
}
