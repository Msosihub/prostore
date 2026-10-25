import "server-only";

import { prisma } from "@/db/prisma";
import { sendSms } from "./africasTalking";
// import { CartItem } from "@/types";

export async function fulfillOrder(
  orderId: string,
  attempt: string,
  reference: string,
) {
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
  const settled = await prisma.$transaction(async (tx) => {
    // The paid flag, inventory and escrow commit together. Concurrent callbacks
    // serialize on this row; failures roll back the claim so delivery can retry.
    const claim = await tx.order.updateMany({
      where: {
        id: orderId,
        isPaid: false,
        paymentMethod: "ZENOPAY",
        paymentResult: { path: ["zenopay_order_id"], equals: attempt },
      },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentStatus: "COMPLETED",
        paymentResult: {
          zenopay_order_id: attempt,
          transactionId: reference,
          status: "COMPLETED",
        },
      },
    });
    if (!claim.count) return false;
    for (const item of order.orderitems) {
      // Retrieve the current live database product profile record
      const currentProduct = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, name: true, supplierId: true },
      });

      if (!currentProduct) {
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
        where: { id: item.productId, stock: { gte: item.qty } },
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
    return true;
  });
  if (!settled) return false;

  // 3. Dispatch Automated Confirmation SMS to the Buyer
  const buyerPhone = order.user.phone || order.user.paymentPhone;
  if (buyerPhone) {
    const itemNames = order.orderitems
      .map((i) => `${i.qty}x ${i.name}`)
      .join(", ");
    const buyerMsg = `Mambo ${order.user.name}, malipo ya agizo lako #${order.id.slice(0, 8)} yamekamilika! Bidhaa: ${itemNames}. Jumla kuu: TZS ${formatPriceString(Number(order.totalPrice))}. Asante kwa kuchagua Nimboya!`;

    try {
      await sendSms(buyerPhone, buyerMsg);
    } catch {
      console.error("Failed sending fulfillment SMS to buyer");
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
      } catch {
        console.error("Failed sending fulfillment SMS to supplier");
      }
    }
  }

  return true;
}

// Simple locale pricing helper format tool to keep message text strings clean
function formatPriceString(val: number): string {
  return new Intl.NumberFormat("en-US").format(val);
}
