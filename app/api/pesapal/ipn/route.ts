import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { getPesapalToken } from "@/lib/pesapal";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  const trackingId = payload.order_tracking_id;
  if (!trackingId) {
    return NextResponse.json({ ok: false });
  }

  const { token } = await getPesapalToken();

  const res = await fetch(
    `${process.env.PESAPAL_BASE_URL}/Transactions/GetTransactionStatus?order_tracking_id=${trackingId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  const status = await res.json();

  const orderId = status.merchant_reference;

  // idempotency: if already paid, exit
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!existing || existing.isPaid) {
    return NextResponse.json({ ok: true });
  }

  if (status.payment_status_description === "Completed") {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentStatus: "COMPLETED",
        paymentResult: {
          gateway: "PESAPAL",
          trackingId,
          status: status.payment_status_description,
          method: status.payment_method,
          amount: status.amount,
          currency: status.currency,
          raw: status,
        },
      },
    });
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: status.payment_status_description.toUpperCase(),
        paymentResult: status,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
