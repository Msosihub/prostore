import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/prisma";
import { getPesapalStatus } from "@/lib/pesapal";
import { PESAPAL_METHODS, pesapalTrackingId } from "@/lib/payment-methods";
import { settleOrder } from "@/lib/order-fulfillment";
import type { Prisma } from "@prisma/client";

async function processNotification(payload: unknown) {
  const input = z
    .object({
      OrderTrackingId: z.string().uuid().optional(),
      orderTrackingId: z.string().uuid().optional(),
      order_tracking_id: z.string().uuid().optional(),
    })
    .safeParse(payload);
  if (!input.success)
    return NextResponse.json(
      { error: "Invalid notification" },
      { status: 400 },
    );
  const ids = Object.values(input.data).filter((value): value is string =>
    Boolean(value),
  );
  if (!ids.length || new Set(ids).size !== 1)
    return NextResponse.json(
      { error: "Invalid tracking reference" },
      { status: 400 },
    );
  const trackingId = ids[0];
  try {
    const status = await getPesapalStatus(trackingId);
    const order = await prisma.order.findUnique({
      where: { id: status.merchant_reference },
    });
    if (
      !order ||
      !PESAPAL_METHODS.includes(order.paymentMethod) ||
      pesapalTrackingId(order.paymentResult) !== trackingId
    )
      return NextResponse.json(
        { error: "Unknown Pesapal payment" },
        { status: 409 },
      );
    if (status.currency !== "TZS" || status.amount !== Number(order.totalPrice))
      return NextResponse.json(
        { error: "Payment amount or currency mismatch" },
        { status: 409 },
      );
    if (status.payment_status_description === "REVERSED")
      return NextResponse.json(
        { error: "Payment reversal requires reconciliation" },
        { status: 409 },
      );
    if (status.payment_status_description === "COMPLETED") {
      await settleOrder(order.id, {
        gateway: "PESAPAL",
        trackingId,
        reference: status.confirmation_code!.trim(),
        amount: status.amount,
        currency: "TZS",
      });
    } else if (status.payment_status_description === "FAILED") {
      await prisma.order.updateMany({
        where: {
          id: order.id,
          isPaid: false,
          paymentMethod: { in: PESAPAL_METHODS },
          paymentResult: {
            equals: order.paymentResult as Prisma.InputJsonValue,
          },
        },
        data: { paymentStatus: "FAILED" },
      });
    }
    return NextResponse.json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId: trackingId,
      orderMerchantReference: order.id,
      status: 200,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Payment verification unavailable; retry notification",
        status: 500,
      },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  return processNotification(await req.json().catch(() => null));
}
export async function GET(req: Request) {
  return processNotification(Object.fromEntries(new URL(req.url).searchParams));
}
