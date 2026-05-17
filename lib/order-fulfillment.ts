// A reusable utility function that safely handles inventory updates and triggers custom SMS alerts
// to both the customer and the relevant suppliers.
import { prisma } from "@/db/prisma";
import { sendSms } from "./africasTalking";

export async function fulfillOrder(orderId: string) {
  // 1. Fetch Order with Items, Customer info, and Suppliers in one clean query
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      orderitems: {
        include: {
          product: {
            include: {
              supplier: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found during fulfillment.`);
  }

  // 2. Execute stock reductions safely inside a Transaction
  await prisma.$transaction(async (tx) => {
    for (const item of order.orderitems) {
      // Check current stock first
      const currentProduct = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, name: true },
      });

      if (!currentProduct || currentProduct.stock < item.qty) {
        throw new Error(
          `Insufficient stock for "${currentProduct?.name || item.name}". Required: ${item.qty}, Available: ${currentProduct?.stock || 0}`
        );
      }

      // Deduct inventory
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.qty,
          },
        },
      });
    }
  });

  // 3. Send SMS to the Buyer
  const buyerPhone = order.user.phone || order.user.paymentPhone;
  if (buyerPhone) {
    const itemNames = order.orderitems
      .map((i) => `${i.qty}x ${i.name}`)
      .join(", ");
    const buyerMsg = `Mambo ${order.user.name}, malipo ya order #${order.id.slice(0, 8)} yamekamilika! Bidhaa: ${itemNames}. Jumla: TZS ${order.totalPrice}. Asante kwa kutuamini!`;

    try {
      await sendSms(buyerPhone, buyerMsg);
    } catch (smsErr) {
      console.error("Failed sending SMS to buyer:", smsErr);
    }
  }

  // 4. Group order items by Supplier to send consolidated notifications
  const supplierGroups: Record<
    string,
    {
      phone: string | null;
      name: string;
      items: Array<{ name: string; qty: number }>;
    }
  > = {};

  for (const item of order.orderitems) {
    const supplier = item.product?.supplier;
    if (!supplier) continue;

    if (!supplierGroups[supplier.id]) {
      supplierGroups[supplier.id] = {
        phone: supplier.phone,
        name: supplier.name,
        items: [],
      };
    }
    supplierGroups[supplier.id].items.push({ name: item.name, qty: item.qty });
  }

  // 5. Send consolidated SMS notifications to each Supplier
  for (const supplierId in supplierGroups) {
    const group = supplierGroups[supplierId];
    if (group.phone) {
      const supplierItemsStr = group.items
        .map((i) => `${i.qty}x ${i.name}`)
        .join(", ");
      const supplierMsg = `Habari ${group.name}, una order mpya! Order ID: #${order.id.slice(0, 8)}. Bidhaa za kuandaa: ${supplierItemsStr}. Tafadhali ingia nimboya Dashboard.`;

      try {
        await sendSms(group.phone, supplierMsg);
      } catch (smsErr) {
        console.error(`Failed sending SMS to supplier ${group.name}:`, smsErr);
      }
    }
  }

  return true;
}
