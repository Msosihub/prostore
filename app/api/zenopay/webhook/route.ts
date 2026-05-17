import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";
import { fulfillOrder } from "@/lib/order-fulfillment";
import { sendSms } from "@/lib/africasTalking";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("Zenopay webhook payload parsed:", payload);

    const { order_id, payment_status, reference, buyer_phone } = payload;

    // 1. Instantly alert internal admin line of the webhook arrival
    const alertMsg = `Zenopay Payment Event!\nOrder: ${order_id}\nStatus: ${payment_status}\nRef: ${reference}\nPhone: ${buyer_phone}`;
    try {
      await sendSms("+255760111880", alertMsg);
    } catch (e) {
      console.error("Admin SMS tracking failure:", e);
    }

    // 2. Locate the targets order records
    const order = await prisma.order.findUnique({
      where: { id: order_id },
    });

    if (!order) {
      console.error(`Order ${order_id} not found in database.`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3. Process database statuses safely
    if (payment_status === "COMPLETED") {
      // Avoid duplicate executions if webhook delivers multiple times
      if (order.isPaid) {
        return NextResponse.json({
          received: true,
          message: "Already processed",
        });
      }

      // Update basic status tracking
      await prisma.order.update({
        where: { id: order.id },
        data: {
          isPaid: true,
          paidAt: new Date(),
          paymentStatus: "COMPLETED",
          paymentResult: {
            transactionId: reference,
            status: payment_status,
            raw: payload,
          },
        },
      });

      // 4. Trigger our new reusable multi-party fulfillment workflow
      await fulfillOrder(order.id);
      console.log(`Order ${order_id} successfully fulfilled.`);
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "FAILED",
          paymentResult: {
            status: payment_status,
            raw: payload,
          },
        },
      });
      console.log(`Order ${order_id} was marked as FAILED.`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("Webhook processing error encountered:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error },
      { status: 500 }
    );
  }
}
