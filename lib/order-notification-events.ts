import "server-only";
import { prisma } from "@/db/prisma";
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
export type OrderNotificationKind =
  | "BUYER_PAYMENT"
  | "SELLER_PAYMENT"
  | "SELLER_DELIVERY"
  | "BUYER_DISPATCH"
  | "BUYER_REMINDER";
export async function queueOrderNotification(
  tx: Tx,
  input: {
    orderId: string;
    kind: OrderNotificationKind;
    targetId: string;
    productId?: string;
  },
) {
  const eventKey = `${input.kind}:${input.orderId}:${input.targetId}:${input.productId ?? ""}`;
  // Keep the unique row as a tombstone even after history cleanup: replay must never recreate a send.
  return tx.orderNotification.upsert({
    where: { eventKey },
    create: {
      ...input,
      eventKey,
      events: { create: { state: "QUEUED", reason: "ORDER_EVENT_COMMITTED" } },
    },
    update: {},
  });
}
