import "server-only";

import { Prisma } from "@prisma/client";
import {
  COD_METHODS,
  PESAPAL_METHODS,
  pesapalTrackingId,
} from "@/lib/payment-methods";
import { prisma } from "@/db/prisma";
import { queueOrderNotification } from "@/lib/order-notification-events";
// import { CartItem } from "@/types";

type Settlement =
  | { gateway: "ZENOPAY"; attempt: string; reference: string; amount?: number }
  | {
      gateway: "PESAPAL";
      trackingId: string;
      reference: string;
      amount: number;
      currency: "TZS";
    }
  | { gateway: "COD"; actorId: string };

// Compatibility entry point for the verified ZenoPay reconciliation flow.
export async function fulfillOrder(
  orderId: string,
  attempt: string,
  reference: string,
  amount?: number,
) {
  return settleOrder(orderId, {
    gateway: "ZENOPAY",
    attempt,
    reference,
    amount,
  });
}

// Server-only: proofs originate from verified provider status or an admin COD action.
export async function settleOrder(orderId: string, settlement: Settlement) {
  // 1. Fetch Order with Items, Customer info, and Suppliers in one clean query pass
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      orderitems: true, // Pull order items array list parameters cleanly
    },
  });

  if (!order || order.orderitems.length === 0) {
    throw new Error(`Order ${orderId} sio halali kwenye mfumo wa malipo.`);
  }

  let methodFilter: Prisma.OrderWhereInput;
  let result: Prisma.InputJsonObject;
  if (settlement.gateway === "ZENOPAY") {
    if (order.paymentMethod !== "ZENOPAY")
      throw new Error("Payment method mismatch");
    methodFilter = {
      paymentMethod: "ZENOPAY",
      paymentResult: { path: ["zenopay_order_id"], equals: settlement.attempt },
    };
    result = {
      gateway: "ZENOPAY",
      zenopay_order_id: settlement.attempt,
      transactionId: settlement.reference,
      status: "COMPLETED",
    };
  } else if (settlement.gateway === "PESAPAL") {
    if (
      !PESAPAL_METHODS.includes(order.paymentMethod) ||
      pesapalTrackingId(order.paymentResult) !== settlement.trackingId
    )
      throw new Error("Payment method or attempt mismatch");
    if (settlement.currency !== "TZS")
      throw new Error("Payment currency mismatch");
    methodFilter = {
      paymentMethod: { in: PESAPAL_METHODS },
      paymentResult: { equals: order.paymentResult as Prisma.InputJsonValue },
    };
    result = {
      gateway: "PESAPAL",
      trackingId: settlement.trackingId,
      transactionId: settlement.reference,
      status: "COMPLETED",
      currency: "TZS",
    };
  } else {
    if (!COD_METHODS.includes(order.paymentMethod))
      throw new Error("Order is not cash on delivery");
    if (order.isPaid) return false;
    if (order.paymentResult !== null)
      throw new Error("Existing payment requires reconciliation");
    methodFilter = {
      paymentMethod: { in: COD_METHODS },
      paymentResult: { equals: Prisma.AnyNull },
    };
    result = {
      gateway: "COD",
      recordedBy: settlement.actorId,
      status: "COMPLETED",
    };
  }
  const amount =
    settlement.gateway === "COD"
      ? Number(order.totalPrice)
      : (settlement.amount ?? Number(order.totalPrice));
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount !== Number(order.totalPrice)
  )
    throw new Error("Payment amount mismatch");

  // Paid state, inventory and escrow share the same conditional transaction.
  const settled = await prisma.$transaction(async (tx) => {
    // The paid flag, inventory and escrow commit together. Concurrent callbacks
    // serialize on this row; failures roll back the claim so delivery can retry.
    const claim = await tx.order.updateMany({
      where: {
        id: orderId,
        isPaid: false,
        ...methodFilter,
        totalPrice: amount,
      },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentStatus: "COMPLETED",
        paymentResult: result,
      },
    });
    if (!claim.count) return false;
    for (const item of [...order.orderitems].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    )) {
      // Retrieve the current live database product profile record
      const currentProduct = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, name: true, supplierId: true },
      });

      if (
        !currentProduct ||
        !item.supplierId ||
        currentProduct.supplierId !== item.supplierId
      ) {
        throw new Error(
          `Bidhaa ${item.name} haikupatikana wakati wa kukamilisha agizo.`,
        );
      }

      if (!Number.isSafeInteger(item.qty) || item.qty < 1) {
        throw new Error("Invalid order item quantity");
      }
      // Legacy partial fulfillment cannot safely be replayed without reviewing
      // inventory. Roll back rather than decrementing stock a second time.
      const existingLedger = await tx.supplierLedger.findUnique({
        where: { reference: `ESCROW_CREDIT_${orderId}_${item.productId}` },
      });
      if (existingLedger)
        throw new Error("Existing escrow requires reconciliation");

      // Test and decrement in one SQL statement to prevent overselling.
      const stock = await tx.product.updateMany({
        where: {
          id: item.productId,
          supplierId: item.supplierId,
          stock: { gte: item.qty },
        },
        data: { stock: { decrement: item.qty } },
      });
      if (!stock.count) throw new Error("Insufficient stock for paid order");

      // Action B: Initialize the itemized escrow state flag on the order item row
      await tx.orderItem.update({
        where: {
          orderId_productId: {
            orderId: orderId,
            productId: item.productId,
          },
        },
        data: {
          status: "PAID",
          payoutStatus: "ESCROW",
        },
      });

      // Action C: 🟢 ESCROW INJECTION: Move earnings into the target Supplier's pendingBalance wallet account
      if (currentProduct.supplierId) {
        const lineItemWholesaleTotal = Number(item.price) * item.qty;

        await tx.supplier.update({
          where: { id: currentProduct.supplierId },
          data: {
            pendingBalance: {
              increment: lineItemWholesaleTotal, // Funds lock in escrow state safely
            },
          },
        });

        await tx.supplierLedger.create({
          data: {
            supplierId: currentProduct.supplierId,
            orderId,
            orderItemId: item.orderId,
            type: "ESCROW_CREDIT",
            amount: lineItemWholesaleTotal,
            status: "COMPLETED",
            reference: `ESCROW_CREDIT_${orderId}_${item.productId}`,
            metadata: {
              productId: item.productId,
              productName: item.name,
              qty: item.qty,
              price: item.price,
            },
          },
        });

        console.log(
          `TZS ${lineItemWholesaleTotal} locked in pending escrow wallet balance for Supplier ID: ${currentProduct.supplierId}`,
        );
      }
    }
    await queueOrderNotification(tx, {
      orderId,
      kind: "BUYER_PAYMENT",
      targetId: order.userId,
    });
    for (const supplierId of [
      ...new Set(
        order.orderitems
          .map((item) => item.supplierId)
          .filter((id): id is string => !!id),
      ),
    ].sort()) {
      await queueOrderNotification(tx, {
        orderId,
        kind: "SELLER_PAYMENT",
        targetId: supplierId,
      });
    }
    return true;
  });
  return settled;
}
