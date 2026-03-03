import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const payload = await req.json();

  console.log("Zenopay webhook:", payload);

  const { order_id, status, transaction_id } = payload;

  const order = await prisma.order.findUnique({
    where: { id: order_id },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (status === "success") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentStatus: "COMPLETED",
        paymentResult: {
          transactionId: transaction_id,
          status,
          raw: payload,
        },
      },
    });
  } else {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "FAILED",
        paymentResult: {
          status,
          raw: payload,
        },
      },
    });
  }

  return NextResponse.json({ received: true });
}
