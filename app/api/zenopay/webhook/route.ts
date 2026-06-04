import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";
import { fulfillOrder } from "@/lib/order-fulfillment";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("Zenopay webhook payload parsed:", payload);

    const { order_id, payment_status, reference } = payload;

    // 🟢 SOLUTION: Safely parse and strip the unique retry timestamp suffix away
    // Example: "66d89181-...-17159740" -> "66d89181-..."
    const cleanOrderId = order_id.includes("=")
      ? order_id.split("=")[0]
      : order_id;

    // Locate the targets order record using the original clean UUID
    const order = await prisma.order.findUnique({
      where: { id: cleanOrderId },
    });

    if (!order) {
      console.error(`Order ${cleanOrderId} not found in database.`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Process database statuses safely
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

      // Trigger our new reusable multi-party fulfillment workflow
      await fulfillOrder(order.id);
      console.log(`Order ${order.id} successfully fulfilled.`);
    } else {
      // 🚨 ONLY update status to FAILED if the order isn't ALREADY successfully paid
      // (This prevents an old retry callback from accidentally breaking a successful payment row)
      if (!order.isPaid) {
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
        console.log(`Order ${order.id} was marked as FAILED.`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("Webhook processing error encountered:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error },
      { status: 500 },
    );
  }
}
