import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { queueOrderNotification } from "@/lib/order-notification-events";

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

type Actor = { kind: "buyer" | "admin"; userId: string };
const releasableStatuses = ["PAID", "PREPARING", "DISPATCHED"] as const;

// Every delivery/dispute writer locks the parent first. This serializes item vs
// whole-order changes and lets the final item observe prior committed deliveries.
export async function lockPaidOrder(tx: TransactionClient, orderId: string) {
  const rows = await tx.$queryRaw<
    Array<{ id: string }>
  >`SELECT "id" FROM "Order" WHERE "id" = ${orderId}::uuid FOR UPDATE`;
  if (!rows.length) throw new Error("Order not found");
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { orderitems: true, user: { select: { name: true } } },
  });
  if (!order?.isPaid || !order.orderitems.length)
    throw new Error("Order is not paid or has no items");
  return order;
}

export async function confirmDelivery(
  orderId: string,
  productId: string | undefined,
  actor: Actor,
  feedback?: { rating: number; comment: string },
) {
  const notifications = await prisma.$transaction(
    async (tx) => {
      const order = await lockPaidOrder(tx, orderId);
      if (
        actor.kind === "buyer" &&
        (order.userId !== actor.userId || !productId)
      )
        throw new Error("Unauthorized");
      const items = order.orderitems
        .filter((item) => !productId || item.productId === productId)
        .sort((a, b) => a.productId.localeCompare(b.productId));
      if (!items.length) throw new Error("Item not found");
      const completed = [];
      for (const item of items) {
        if (item.isDelivered) continue;
        if (
          !item.supplierId ||
          !releasableStatuses.some((status) => status === item.status) ||
          item.payoutStatus !== "ESCROW"
        )
          throw new Error("Item cannot release escrow");
        const refund = await tx.moneyReviewCase.findFirst({ where: { kind: "REFUND", orderId, productId: item.productId, state: { in: ["REQUESTED", "UNDER_REVIEW", "APPROVED"] } }, select: { id: true } });
        if (refund) throw new Error("Refund review blocks escrow release");
        const dispute = await tx.returnRequest.findUnique({
          where: { orderId_productId: { orderId, productId: item.productId } },
        });
        if (dispute && dispute.status !== "REJECTED")
          throw new Error("Dispute blocks escrow release");
        const amount = new Prisma.Decimal(item.price).mul(item.qty);
        const credit = await tx.supplierLedger.findUnique({
          where: { reference: `ESCROW_CREDIT_${orderId}_${item.productId}` },
        });
        if (
          !credit ||
          credit.supplierId !== item.supplierId ||
          credit.type !== "ESCROW_CREDIT" ||
          credit.status !== "COMPLETED" ||
          !amount.equals(credit.amount) ||
          !amount.greaterThan(0)
        )
          throw new Error("Escrow credit requires reconciliation");
        const releaseReference = `ESCROW_RELEASE_${orderId}_${item.productId}`;
        if (
          await tx.supplierLedger.findUnique({
            where: { reference: releaseReference },
          })
        )
          throw new Error("Legacy release requires reconciliation");
        const released = await tx.orderItem.updateMany({
          where: {
            orderId,
            productId: item.productId,
            isDelivered: false,
            payoutStatus: "ESCROW",
            status: { in: [...releasableStatuses] },
          },
          data: {
            isDelivered: true,
            deliveredAt: new Date(),
            status: "DELIVERED",
            payoutStatus: "PAID",
            ...(feedback
              ? {
                  buyerDeliveryRating: feedback.rating,
                  buyerDeliveryComment: feedback.comment,
                }
              : {}),
          },
        });
        if (released.count !== 1)
          throw new Error("Item changed during release");
        const wallet = await tx.supplier.updateMany({
          where: { id: item.supplierId, pendingBalance: { gte: amount } },
          data: {
            pendingBalance: { decrement: amount },
            walletBalance: { increment: amount },
          },
        });
        if (wallet.count !== 1) throw new Error("Insufficient escrow balance");
        await tx.supplierLedger.create({
          data: {
            supplierId: item.supplierId,
            orderId,
            type: "ESCROW_RELEASE",
            amount,
            status: "COMPLETED",
            reference: releaseReference,
            metadata: { productId: item.productId, actorId: actor.userId },
          },
        });
        if (feedback)
          await tx.orderDeliveryFeedback.upsert({
            where: {
              orderId_productId: { orderId, productId: item.productId },
            },
            create: {
              orderId,
              productId: item.productId,
              buyerId: actor.userId,
              supplierId: item.supplierId,
              ...feedback,
            },
            update: feedback,
          });
        await queueOrderNotification(tx, {
          orderId,
          kind: "SELLER_DELIVERY",
          targetId: item.supplierId,
          productId: item.productId,
        });
        completed.push({
          supplierId: item.supplierId,
          name: item.name,
          qty: item.qty,
          buyerName: order.user.name,
        });
      }
      const remaining = await tx.orderItem.count({
        where: { orderId, isDelivered: false },
      });
      if (remaining === 0)
        await tx.order.updateMany({
          where: { id: orderId, isDelivered: false },
          data: { isDelivered: true, deliveredAt: new Date() },
        });
      return completed;
    },
    { timeout: 15000, maxWait: 10000 },
  );
  return { released: notifications.length };
}

export async function openOrderDispute(
  orderId: string,
  productId: string,
  buyerId: string,
  reason: string,
) {
  await prisma.$transaction(
    async (tx) => {
      const order = await lockPaidOrder(tx, orderId);
      if (order.userId !== buyerId) throw new Error("Unauthorized");
      const item = order.orderitems.find(
        (item) => item.productId === productId,
      );
      if (
        !item?.supplierId ||
        item.isDelivered ||
        item.payoutStatus !== "ESCROW" ||
        ["RETURNED", "CANCELLED"].includes(item.status)
      )
        throw new Error("Item cannot be disputed; contact support");
      const existing = await tx.returnRequest.findUnique({
        where: { orderId_productId: { orderId, productId } },
      });
      if (
        existing &&
        existing.status !== "REQUESTED" &&
        existing.status !== "REJECTED"
      )
        throw new Error("Dispute already under review");
      await tx.returnRequest.upsert({
        where: { orderId_productId: { orderId, productId } },
        create: {
          orderId,
          productId,
          buyerId,
          supplierId: item.supplierId,
          reason,
          status: "REQUESTED",
        },
        update: { reason, status: "REQUESTED" },
      });
      await tx.orderItem.update({
        where: { orderId_productId: { orderId, productId } },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      });
      if (!existing || existing.reason !== reason)
        await tx.orderItemEvent.create({
          data: {
            orderId,
            productId,
            actorId: buyerId,
            type: "BUYER_REPORTED_PROBLEM",
            note: reason,
          },
        });
    },
    { timeout: 15000, maxWait: 10000 },
  );
}
