"use server";

import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { sendSms } from "@/lib/africasTalking";

async function requireSupplierProfile() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPPLIER") {
    throw new Error("Unauthorized");
  }

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

    const item = await prisma.orderItem.findFirst({
      where: {
        orderId,
        productId,
        supplierId: supplier.id,
        order: { isPaid: true },
      },
      include: {
        order: {
          include: {
            user: { select: { name: true, phone: true, paymentPhone: true } },
          },
        },
      },
    });

    if (!item) throw new Error("Order item not found");

    if (item.isDelivered || item.status === "DELIVERED") {
      return { success: false, message: "Order hii tayari imepokelewa." };
    }

    if (["REJECTED", "RETURNED", "CANCELLED"].includes(item.status)) {
      return {
        success: false,
        message: "Order hii haiwezi kuwekwa dispatched kwa sasa.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: {
          orderId_productId: { orderId, productId },
        },
        data: {
          status: "DISPATCHED",
          dispatchedAt: new Date(),
          dispatchNote: note || "",
        },
      });

      await tx.orderItemEvent.create({
        data: {
          orderId,
          productId,
          actorId: session.user.id,
          type: "DISPATCHED",
          note: note || "",
          metadata: {
            supplierId: supplier.id,
            itemName: item.name,
            qty: item.qty,
          },
        },
      });
    });

    const buyerPhone = item.order.user.phone || item.order.user.paymentPhone;

    if (buyerPhone) {
      await sendSms(
        buyerPhone,
        `Nimboya: Mzigo wako "${item.name}" umetumwa.

${note || ""}

Agizo #${orderId.slice(0, 8)}

Ukipokea, tafadhali thibitisha kwenye akaunti yako.`,
      );
    }

    revalidatePath("/supplier/orders");
    revalidatePath(`/order/${orderId}`);
    revalidatePath("/supplier/overview");

    return { success: true, message: "Mzigo umewekwa dispatched." };
  } catch (error) {
    console.error("Dispatch action failed:", error);
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
        order: { isPaid: true },
      },
      include: {
        order: {
          include: {
            user: { select: { name: true, phone: true, paymentPhone: true } },
          },
        },
      },
    });

    if (!item) throw new Error("Order item not found");

    const buyerPhone = item.order.user.phone || item.order.user.paymentPhone;

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
  } catch (error) {
    console.error("Reminder SMS failed:", error);
    return { success: false, message: "Imeshindikana kutuma reminder." };
  }
}
