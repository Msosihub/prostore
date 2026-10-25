import { prisma } from "@/db/prisma";
import { getZenopayStatus } from "@/lib/zenopay";
import { fulfillOrder } from "@/lib/order-fulfillment";

export function paymentAttempt(result: unknown): string | undefined {
  if (
    result &&
    typeof result === "object" &&
    "zenopay_order_id" in result &&
    typeof result.zenopay_order_id === "string"
  )
    return result.zenopay_order_id;
}

export async function reconcileZenopay(orderId: string, attempt: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (
    !order ||
    order.paymentMethod !== "ZENOPAY" ||
    paymentAttempt(order.paymentResult) !== attempt
  ) {
    throw new Error("Unknown payment attempt");
  }
  if (order.isPaid) return "COMPLETED";
  const payment = await getZenopayStatus(attempt);
  if (payment.amount !== Number(order.totalPrice))
    throw new Error("Payment amount mismatch");
  if (payment.payment_status === "COMPLETED") {
    await fulfillOrder(orderId, attempt, payment.reference!);
  } else if (payment.payment_status === "FAILED") {
    await prisma.order.updateMany({
      where: {
        id: orderId,
        isPaid: false,
        paymentResult: { path: ["zenopay_order_id"], equals: attempt },
      },
      data: { paymentStatus: "FAILED" },
    });
  }
  // PENDING/unknown callbacks must never downgrade a terminal state.
  const current = await prisma.order.findUnique({
    where: { id: orderId },
    select: { paymentStatus: true },
  });
  return current!.paymentStatus;
}
