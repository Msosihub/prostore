"use server";

import { z } from "zod";
import { deliveryContact, deliverySmsRecipient } from "@/lib/fulfillment-view";
import { lockPaidOrder } from "@/lib/order-delivery";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { sendSms } from "@/lib/africasTalking";

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
      return {
        name: item.name,
        phone: deliveryContact(order.shippingAddress).phone,
        note: input.note,
      };
    });
    const recipient = deliverySmsRecipient(changed?.phone);
    let notificationFailed = !!changed && !recipient;
    if (changed && recipient) {
      try {
        await sendSms(
          recipient,
          `Nimboya: Mzigo wako "${changed.name}" umetumwa.\n${changed.note || ""}\nAgizo #${orderId.slice(0, 8)}. Ukipokea, thibitisha kwenye akaunti yako.`,
        );
      } catch {
        notificationFailed = true;
        console.error("Dispatch notification failed after committed dispatch");
      }
    }

    revalidatePath("/supplier/orders");
    revalidatePath(`/order/${orderId}`);
    revalidatePath("/supplier/overview");

    return {
      success: true,
      message: notificationFailed
        ? "Mzigo umerekodiwa umetumwa; SMS haikufika. Taarifa ipo kwenye agizo."
        : changed
          ? "Mzigo umewekwa dispatched."
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

    const item = await prisma.orderItem.findFirst({
      where: {
        orderId,
        productId,
        supplierId: supplier.id,
        isDelivered: false,
        status: "DISPATCHED",
        order: { isPaid: true },
      },
      include: { order: { select: { shippingAddress: true } } },
    });

    if (!item) throw new Error("Order item not found");

    const buyerPhone = deliverySmsRecipient(
      deliveryContact(item.order.shippingAddress).phone,
    );

    if (!buyerPhone) {
      return { success: false, message: "Mteja hana namba ya SMS." };
    }

    await sendSms(
      buyerPhone,
      `Nimboya: Tafadhali thibitisha kama umepokea "${item.name}" kwa agizo #${orderId.slice(0, 8)}. Hii itasaidia supplier kulipwa kwa wakati.`,
    );

    await prisma.orderItemEvent.create({
      data: {
        orderId,
        productId,
        actorId: supplier.userId,
        type: "DELIVERY_CONFIRMATION_REMINDER_SENT",
      },
    });

    return { success: true, message: "SMS reminder imetumwa kwa buyer." };
  } catch {
    console.error("Reminder SMS failed");
    return { success: false, message: "Imeshindikana kutuma reminder." };
  }
}
