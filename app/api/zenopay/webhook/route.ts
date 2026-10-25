import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { paymentAttempt, reconcileZenopay } from "@/lib/zenopay-reconciliation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const input = z
    .object({ order_id: z.string().min(1).max(150) })
    .safeParse(await req.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Invalid notification" },
      { status: 400 },
    );
  const attempt = input.data.order_id;
  const orderId = attempt.split("=")[0];
  if (!z.string().uuid().safeParse(orderId).success)
    return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (
      !order ||
      order.paymentMethod !== "ZENOPAY" ||
      paymentAttempt(order.paymentResult) !== attempt
    ) {
      return NextResponse.json(
        { error: "Unknown payment attempt" },
        { status: 404 },
      );
    }
    await reconcileZenopay(orderId, attempt);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Payment verification unavailable; retry notification" },
      { status: 503 },
    );
  }
}
