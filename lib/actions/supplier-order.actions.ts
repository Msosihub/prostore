"use server";

import { z } from "zod";

import { lockPaidOrder } from "@/lib/order-delivery";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { queueOrderNotification } from "@/lib/order-notification-events";

async function requireSupplierProfile() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPPLIER") {
    throw new Error("Unauthorized");
  }

  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (current?.role !== "SUPPLIER") throw new Error("Unauthorized");
  const supplier = await prisma.supplier.findUnique({
    where: { userId: session.user.id },
  });

  if (!supplier) throw new Error("Supplier profile not found");

  return { session, supplier };
}

export async function markItemDispatched({
  orderId,
  productId,
  note,
}: {
  orderId: string;
  productId: string;
  note?: string;
}) {
  try {
    const { session, supplier } = await requireSupplierProfile();

    const input = z
      .object({
        orderId: z.string().uuid(),
        productId: z.string().uuid(),
        note: z.string().trim().max(180).optional(),
      })
      .parse({ orderId, productId, note });
    const changed = await prisma.$transaction(async (tx) => {
      const order = await lockPaidOrder(tx, input.orderId);
      const item = order.orderitems.find(
        (row) =>
          row.productId === input.productId && row.supplierId === supplier.id,
      );
      if (!item) throw new Error("Order item not found");
      if (item.status === "DISPATCHED" || item.isDelivered) return null;
      if (!["PAID", "PREPARING"].includes(item.status))
        throw new Error("Item cannot dispatch");
      const dispute = await tx.returnRequest.findUnique({
        where: { orderId_productId: { orderId, productId } },
      });
      if (dispute && dispute.status !== "REJECTED")
        throw new Error("Dispute blocks dispatch");
      await tx.orderItem.update({
        where: { orderId_productId: { orderId, productId } },
        data: {
          status: "DISPATCHED",
          dispatchedAt: new Date(),
          dispatchNote: input.note || "",
        },
      });
      await tx.orderItemEvent.create({
        data: {
          orderId,
          productId,
          actorId: session.user.id,
          type: "DISPATCHED",
          note: input.note || "",
          metadata: { supplierId: supplier.id, source: "MANUAL" },
        },
      });
      await queueOrderNotification(tx, {
        orderId,
        kind: "BUYER_DISPATCH",
        targetId: order.userId,
        productId,
      });
      return true;
    });

    revalidatePath("/supplier/orders");
    revalidatePath(`/order/${orderId}`);
    revalidatePath("/supplier/overview");

    return {
      success: true,
      message: changed
        ? "Mzigo umerekodiwa umetumwa; taarifa ya SMS imewekwa kwenye foleni."
        : "Mzigo huu tayari umerekodiwa umetumwa au kupokelewa.",
    };
  } catch {
    console.error("Dispatch action failed");
    return { success: false, message: "Imeshindikana kuweka dispatched." };
  }
}

export async function remindBuyerToConfirmDelivery({
  orderId,
  productId,
}: {
  orderId: string;
  productId: string;
}) {
  try {
    const { supplier } = await requireSupplierProfile();

    const ids = z
      .object({ orderId: z.string().uuid(), productId: z.string().uuid() })
      .parse({ orderId, productId });
    await prisma.$transaction(async (tx) => {
      const order = await lockPaidOrder(tx, ids.orderId);
      const item = order.orderitems.find(
        (item) =>
          item.productId === ids.productId &&
          item.supplierId === supplier.id &&
          !item.isDelivered &&
          item.status === "DISPATCHED",
      );
      if (!item) throw new Error("Order item not found");
      const dispute = await tx.returnRequest.findUnique({
        where: { orderId_productId: ids },
      });
      if (dispute && dispute.status !== "REJECTED")
        throw new Error("Dispute blocks reminder");
      await queueOrderNotification(tx, {
        orderId,
        productId,
        kind: "BUYER_REMINDER",
        targetId: order.userId,
      });
    });
    return {
      success: true,
      message:
        "Taarifa ya ukumbusho imewekwa kwenye foleni; maombi yanayorudiwa hayatumi SMS nyingine.",
    };
  } catch {
    console.error("Reminder SMS failed");
    return { success: false, message: "Imeshindikana kutuma reminder." };
  }
}
