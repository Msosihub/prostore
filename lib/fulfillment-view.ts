import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { z } from "zod";

export function deliveryContact(value: unknown) {
  const address =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const field = (name: string) =>
    typeof address[name] === "string" ? (address[name] as string) : "";
  return {
    fullName: field("fullName"),
    streetAddress: field("streetAddress"),
    city: field("city"),
    postalCode: field("postalCode"),
    country: field("country"),
    phone: field("phone"),
  };
}

// A seller receives only its paid lines and the delivery snapshot, never payment
// credentials, the buyer's mutable profile or another seller's item/financial data.
export async function getFulfillmentOrder(orderId: string, sellerOnly = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const id = z.string().uuid().parse(orderId);
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!actor || (sellerOnly && actor.role !== "SUPPLIER"))
    throw new Error("Unauthorized");
  const seller =
    actor.role === "SUPPLIER"
      ? await prisma.supplier.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        })
      : null;
  if (actor.role === "SUPPLIER" && !seller) throw new Error("Unauthorized");
  const order = await prisma.order.findFirst({
    where: {
      id,
      ...(seller
        ? { isPaid: true, orderitems: { some: { supplierId: seller.id } } }
        : actor.role === "ADMIN"
          ? {}
          : { userId: session.user.id }),
    },
    select: {
      id: true,
      createdAt: true,
      isPaid: true,
      paidAt: true,
      shippingAddress: true,
      orderitems: {
        where: seller ? { supplierId: seller.id } : undefined,
        orderBy: { productId: "asc" },
        select: {
          productId: true,
          supplierId: true,
          supplierName: true,
          name: true,
          qty: true,
          price: true,
          status: true,
          isDelivered: true,
          deliveredAt: true,
          dispatchedAt: true,
          dispatchNote: true,
          payoutStatus: true,
          buyerDeliveryRating: true,
          buyerDeliveryComment: true,
          rejectionReason: true,
        },
      },
    },
  });
  if (!order) return null;
  const disputes = await prisma.returnRequest.findMany({
    where: {
      orderId: id,
      productId: { in: order.orderitems.map((item) => item.productId) },
    },
    select: { productId: true, status: true },
  });
  return {
    ...order,
    shippingAddress: deliveryContact(order.shippingAddress),
    orderitems: order.orderitems.map((item) => ({
      ...item,
      price: item.price.toString(),
      disputeStatus:
        disputes.find((d) => d.productId === item.productId)?.status ?? null,
    })),
  };
}

export function deliverySmsRecipient(value: unknown) {
  if (typeof value !== "string") return null;
  let phone = value.trim().replace(/\s+/g, "");
  if (phone.startsWith("0")) phone = "+255" + phone.slice(1);
  else if (phone.startsWith("255")) phone = "+" + phone;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}
