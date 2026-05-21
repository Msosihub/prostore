"use server";

import { prisma } from "@/db/prisma";
import { sendSms } from "./africasTalking";
// import { CartItem } from "@/types";

export async function fulfillOrder(orderId: string) {
  // 1. Fetch Order with Items, Customer info, and Suppliers in one clean query pass
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      orderitems: true, // Pull order items array list parameters cleanly
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} sio halali kwenye mfumo wa malipo.`);
  }

  // 2. Execute stock reductions AND Escrow Ledger calculations safely inside a single transaction
  await prisma.$transaction(async (tx) => {
    for (const item of order.orderitems) {
      // Retrieve the current live database product profile record
      const currentProduct = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, name: true, supplierId: true },
      });

      if (!currentProduct) {
        throw new Error(
          `Bidhaa ${item.name} haikupatikana wakati wa kukamilisha agizo.`
        );
      }

      // Strict race condition stock checker guard
      if (currentProduct.stock < item.qty) {
        throw new Error(
          `Mzigo wa "${currentProduct.name}" hautoshi kukamilisha agizo hili. Unaomba: ${item.qty}, Zilizopo: ${currentProduct.stock}`
        );
      }

      // Action A: Deduct inventory levels safely
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.qty,
          },
        },
      });

      // Action B: Initialize the itemized escrow state flag on the order item row
      await tx.orderItem.update({
        where: {
          orderId_productId: {
            orderId: orderId,
            productId: item.productId,
          },
        },
        data: {
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
        console.log(
          `TZS ${lineItemWholesaleTotal} locked in pending escrow wallet balance for Supplier ID: ${currentProduct.supplierId}`
        );
      }
    }
  });

  // 3. Dispatch Automated Confirmation SMS to the Buyer
  const buyerPhone = order.user.phone || order.user.paymentPhone;
  if (buyerPhone) {
    const itemNames = order.orderitems
      .map((i) => `${i.qty}x ${i.name}`)
      .join(", ");
    const buyerMsg = `Mambo ${order.user.name}, malipo ya agizo lako #${order.id.slice(0, 8)} yamekamilika! Bidhaa: ${itemNames}. Jumla kuu: TZS ${formatPriceString(Number(order.totalPrice))}. Asante kwa kuchagua Nimboya!`;

    try {
      await sendSms(buyerPhone, buyerMsg);
    } catch (smsErr) {
      console.error("Failed sending SMS to buyer:", smsErr);
    }
  }

  // 4. Group order items by Supplier to distribute consolidated notification metrics
  const supplierGroups: Record<
    string,
    {
      phone: string | null;
      name: string;
      items: Array<{ name: string; qty: number }>;
    }
  > = {};

  for (const item of order.orderitems) {
    const productData = await prisma.product.findUnique({
      where: { id: item.productId },
      select: {
        supplier: {
          select: { id: true, name: true, companyName: true, phone: true },
        },
      },
    });

    const supplier = productData?.supplier;
    if (!supplier) continue;

    const sName = supplier.companyName || supplier.name;

    if (!supplierGroups[supplier.id]) {
      supplierGroups[supplier.id] = {
        phone: supplier.phone,
        name: sName,
        items: [],
      };
    }
    supplierGroups[supplier.id].items.push({ name: item.name, qty: item.qty });
  }

  // 5. Dispatch single consolidated SMS alert to each vendor involved
  for (const supplierId in supplierGroups) {
    const group = supplierGroups[supplierId];
    if (group.phone) {
      const supplierItemsStr = group.items
        .map((i) => `${i.qty}x ${i.name}`)
        .join(", ");
      const supplierMsg = `Habari ${group.name}, umepokea agizo jipya la jumla! Agizo ID: #${order.id.slice(0, 8)}. Bidhaa za kuandaa: ${supplierItemsStr}. Fedha zimewekwa salama kwenye Escrow yako. Tafadhali ingia Nimboya Dashboard kuanza kuandaa mzigo.`;

      try {
        await sendSms(group.phone, supplierMsg);
      } catch (smsErr) {
        console.error(
          `Failed sending fulfillment alert SMS to supplier ${group.name}:`,
          smsErr
        );
      }
    }
  }

  return true;
}

// Simple locale pricing helper format tool to keep message text strings clean
function formatPriceString(val: number): string {
  return new Intl.NumberFormat("en-US").format(val);
}
