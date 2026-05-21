"use server";

import { convertToPlainObject, formatError, isRedirectError } from "../utils";
import { auth } from "@/auth";
import { getMyCart } from "./cart.actions";
import { getUserById } from "./user.actions";
import { insertOrderSchema } from "../validators";
import { prisma } from "@/db/prisma";
import { CartItem } from "@/types";
import { revalidatePath } from "next/cache";
import { PAGE_SIZE } from "../constants";
import { Prisma } from "@prisma/client";
import { PaymentResult } from "@/types";
import { sendSms } from "../africasTalking";
// import { ShippingAddress } from "@/types";
//import { sendPurchaseReceipt } from "@/email";

// Create order and create the order items
export async function createOrder() {
  try {
    const session = await auth();
    if (!session) throw new Error("User is not authenticated");

    const cart = await getMyCart();
    const userId = session?.user?.id;
    if (!userId) throw new Error("User not found");

    const user = await getUserById(userId);

    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        message: "Your cart is empty",
        redirectTo: "/cart",
      };
    }

    if (!user.address) {
      return {
        success: false,
        message: "No shipping address",
        redirectTo: "/shipping-address",
      };
    }

    if (!user.paymentMethod) {
      return {
        success: false,
        message: "No payment method",
        redirectTo: "/payment-method",
      };
    }

    // Create order object
    const order = insertOrderSchema.parse({
      userId: user.id,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod,
      itemsPrice: cart.itemsPrice,
      shippingPrice: cart.shippingPrice,
      taxPrice: cart.taxPrice,
      totalPrice: cart.totalPrice,
    });

    // Create a transaction to create order and order items in database
    const insertedOrderId = await prisma.$transaction(async (tx) => {
      // Create order
      const insertedOrder = await tx.order.create({ data: order });
      // Create order items from the cart items
      for (const item of cart.items as CartItem[]) {
        const orderItemData = { ...item };

        // @ts-expect-error dont needed
        delete orderItemData.priceTiers;

        await tx.orderItem.create({
          data: {
            ...orderItemData,
            price: item.price,
            orderId: insertedOrder.id,
            slug: item.slug || "",
          },
        });
      }
      // Clear cart
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          items: [],
          totalPrice: 0,
          taxPrice: 0,
          shippingPrice: 0,
          itemsPrice: 0,
        },
      });

      return insertedOrder.id;
    });

    if (!insertedOrderId) throw new Error("Order not created");

    return {
      success: true,
      message: "Order created",
      redirectTo: `/order/${insertedOrderId}`,
      orderData: {
        id: insertedOrderId,
      },
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false, message: formatError(error) };
  }
}
//========================================================================
//Buy now logic
export async function createBuyNowOrder({
  productId,
  qty,
}: {
  productId: string;
  qty: number;
}) {
  try {
    const session = await auth();
    if (!session) throw new Error("User is not authenticated");

    const userId = session?.user?.id;
    if (!userId) throw new Error("User not found");

    const user = await getUserById(userId);
    if (!user.address) {
      return {
        success: false,
        message: "No shipping address",
        redirectTo: "/shipping-address",
      };
    }
    // if (!user.paymentMethod) {
    //   return {
    //     success: false,
    //     message: "No payment method",
    //     redirectTo: "/payment-method",
    //   };
    // }


    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        pricingTiers: true,
      },
    });

    if (!product) return { success: false, message: "Product not found" };
    if (Number(product.stock) < qty)
      return { success: false, message: "Not enough stock" };

    const item: CartItem & { qty: number } = {
      productId: product.id,
      name: product.name,
      image: product.images?.[0] ?? "",
      price: product.price.toString(),
      qty,
      slug: product.slug ?? "",
      priceTiers: product.pricingTiers
        ? product.pricingTiers.map((t) => ({
            minQty: t.minQty,
            price: Number(t.price),
          }))
        : [],
    };

    const cartLike = {
      items: [item],
      itemsPrice: (Number(product.price) * qty).toString(),
      shippingPrice: "0",
      taxPrice: "0",
      totalPrice: (Number(product.price) * qty).toString(),
    };

    const order = insertOrderSchema.parse({
      userId,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod || "Mobile",
      itemsPrice: cartLike.itemsPrice,
      shippingPrice: cartLike.shippingPrice,
      taxPrice: cartLike.taxPrice,
      totalPrice: cartLike.totalPrice,
    });

    const insertedOrderId = await prisma.$transaction(async (tx) => {
      const insertedOrder = await tx.order.create({ data: order });
      for (const it of cartLike.items as CartItem[]) {
        await tx.orderItem.create({
          data: {
            productId: it.productId,
            name: it.name,
            image: it.image,
            price: it.price,
            qty: it.qty,
            orderId: insertedOrder.id,
            slug: it.slug || "",
          },
        });
      }
      return insertedOrder.id;
    });

    return {
      success: true,
      message: "Order created",
      redirectTo: `/order/${insertedOrderId}`,
      orderData: {
        id: insertedOrderId,
      },
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false, message: formatError(error) };
  }
}
//===================================================================
// Get order by id
export async function getOrderById(orderId: string) {
  const data = await prisma.order.findFirst({
    where: {
      id: orderId,
    },
    include: {
      orderitems: true,
      user: { select: { name: true, email: true } },
    },
  });

  return convertToPlainObject(data);
}

// Update order to paid
export async function updateOrderToPaid({
  orderId,
  paymentResult,
}: {
  orderId: string;
  paymentResult?: PaymentResult;
}) {
  // Get order from database
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
    },
    include: {
      orderitems: true,
    },
  });

  if (!order) throw new Error("Order not found");

  if (order.isPaid) throw new Error("Order is already paid");

  // Transaction to update order and account for product stock
  await prisma.$transaction(async (tx) => {
    // Iterate over products and update stock
    for (const item of order.orderitems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: -item.qty } },
      });
    }

    // Set the order to paid
    await tx.order.update({
      where: { id: orderId },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentResult,
      },
    });
  });

  // Get updated order after transaction
  const updatedOrder = await prisma.order.findFirst({
    where: { id: orderId },
    include: {
      orderitems: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!updatedOrder) throw new Error("Order not found");

  // sendPurchaseReceipt({
  //   order: {
  //     ...updatedOrder,
  //     shippingAddress: updatedOrder.shippingAddress as ShippingAddress,
  //     paymentResult: updatedOrder.paymentResult as PaymentResult,
  //   },
  // });
}

// Get user's orders
export async function getMyOrders({
  limit = PAGE_SIZE,
  page,
}: {
  limit?: number;
  page: number;
}) {
  const session = await auth();
  if (!session) throw new Error("User is not authorized");

  const data = await prisma.order.findMany({
    where: { userId: session?.user?.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.order.count({
    where: { userId: session?.user?.id },
  });

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

// type SalesDataType = {
//   month: string;
//   totalSales: number;
// }[];

// Get sales data and order summary
export async function getOrderSummary(supplierId: string) {
  // Get counts for each resource
  // Get all orderItems for this supplier
  const orderItems = await prisma.orderItem.findMany({
    where: { supplierId },
    select: { orderId: true, price: true, qty: true },
  });

  // Extract unique order IDs
  const orderIds = [...new Set(orderItems.map((item) => item.orderId))];

  // Count orders
  const ordersCount = orderIds.length;

  // Count products
  const productsCount = await prisma.product.count({
    where: { supplierId },
  });

  // Count unique users from those orders
  const usersCount = await prisma.order
    .findMany({
      where: { id: { in: orderIds } },
      select: { userId: true },
    })
    .then((orders) => new Set(orders.map((o) => o.userId)).size);

  // Calculate total sales from orderItems (price × qty)
  const totalSales = orderItems.reduce((sum, item) => {
    return sum + Number(item.price) * item.qty;
  }, 0);

  // Monthly sales (based on order creation dates)
  const monthlySalesRaw = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, createdAt: true, totalPrice: true },
  });

  const salesByMonth: Record<string, number> = {};
  for (const order of monthlySalesRaw) {
    const month = order.createdAt.toLocaleDateString("en-US", {
      month: "2-digit",
      year: "2-digit",
    });
    salesByMonth[month] = (salesByMonth[month] || 0) + Number(order.totalPrice);
  }

  const salesData = Object.entries(salesByMonth).map(([month, totalSales]) => ({
    month,
    totalSales,
  }));

  // Latest sales
  const latestSales = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
    take: 6,
  });

  // Calculate the total sales
  // const totalSales = await prisma.order.aggregate({
  //   _sum: { totalPrice: true },
  // });

  // Get monthly sales
  // const salesDataRaw = await prisma.$queryRaw<
  //   Array<{ month: string; totalSales: Prisma.Decimal }>
  // >`SELECT to_char("createdAt", 'MM/YY') as "month", sum("totalPrice") as "totalSales" FROM "Order" GROUP BY to_char("createdAt", 'MM/YY')`;

  // const salesData: SalesDataType = salesDataRaw.map((entry) => ({
  //   month: entry.month,
  //   totalSales: Number(entry.totalSales),
  // }));

  // // Get latest sales
  // const latestSales = await prisma.order.findMany({
  //   orderBy: { createdAt: "desc" },
  //   include: {
  //     user: { select: { name: true } },
  //   },
  //   take: 6,
  // });

  return {
    ordersCount,
    productsCount,
    usersCount,
    totalSales,
    latestSales,
    salesData,
  };
}

// Get all orders
export async function getAllOrders({
  limit = PAGE_SIZE,
  page,
  query,
}: {
  limit?: number;
  page: number;
  query: string;
}) {
  const queryFilter: Prisma.OrderWhereInput =
    query && query !== "all"
      ? {
          user: {
            name: {
              contains: query,
              mode: "insensitive",
            } as Prisma.StringFilter,
          },
        }
      : {};

  const data = await prisma.order.findMany({
    where: {
      ...queryFilter,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: (page - 1) * limit,
    include: { user: { select: { name: true } } },
  });

  const dataCount = await prisma.order.count();

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Delete an order
export async function deleteOrder(id: string) {
  try {
    await prisma.order.delete({ where: { id } });

    revalidatePath("/admin/orders");

    return {
      success: true,
      message: "Order deleted successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update COD order to paid - CashOnDeliver
export async function updateOrderToPaidCOD(orderId: string) {
  try {
    await updateOrderToPaid({ orderId });

    revalidatePath(`/order/${orderId}`);

    return { success: true, message: "Order marked as paid" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update COD order to delivered
export async function deliverOrder(orderId: string) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
      },
    });

    if (!order) throw new Error("Order not found");
    if (!order.isPaid) throw new Error("Order is not paid");

    await prisma.order.update({
      where: { id: orderId },
      data: {
        isDelivered: true,
        deliveredAt: new Date(),
      },
    });

    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: "Order has been marked delivered",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// 🟢 FIND AND REPLACE / ADD THESE TWO METHODS INSIDE: lib/actions/order.actions.ts

/**
 * 1. MARK A SPECIFIC PRODUCT LINE ITEM AS ARRIVED
 * Uses the composite index signature parameters to identify rows cleanly without errors
 */
export async function markOrderItemAsDelivered(
  orderId: string,
  productId: string
) {
  try {
    // Update the targeted item row inside your composite table index layout structure
    const updatedItem = await prisma.orderItem.update({
      where: {
        orderId_productId: {
          orderId: orderId,
          productId: productId,
        },
      },
      data: {
        isDelivered: true,
        deliveredAt: new Date(),
      },
      include: {
        order: {
          include: {
            orderitems: true, // Fetch sister rows to check for total delivery completeness
            user: { select: { name: true } },
          },
        },
      },
    });

    const currentOrder = updatedItem.order;
    const cleanOrderId = currentOrder.id.slice(0, 8);
    const buyerName = currentOrder.user?.name || "Mteja wetu";

    // CASCADING CHECKER: If EVERY single product inside this cart is delivered, update the master Order row too
    const allItemsDelivered = currentOrder.orderitems.every(
      (item) => item.isDelivered
    );

    if (allItemsDelivered) {
      await prisma.order.update({
        where: { id: currentOrder.id },
        data: {
          isDelivered: true,
          deliveredAt: new Date(),
        },
      });
      // console.log(
      //   `Global Order Header row #${cleanOrderId} closed automatically.`
      // );
    }

    // Fetch the supplier's contact details to trigger an instant SMS alert
    const productWithSupplier = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        supplier: {
          select: { name: true, companyName: true, phone: true },
        },
      },
    });

    const supplier = productWithSupplier?.supplier;
    if (supplier?.phone) {
      const sName = supplier.companyName || supplier.name;
      const supplierMsg = `Habari ${sName}, mteja (${buyerName}) amethibitisha kupokea bidhaa yako salama:\n- ${updatedItem.qty}x ${updatedItem.name}\nAgizo ID: #${cleanOrderId}.\nMalipo yako yanashughulikiwa sasa. Asante!`;

      try {
        await sendSms(supplier.phone, supplierMsg);
      } catch (smsErr) {
        console.error(
          `Failed sending single item delivery SMS to supplier ${sName}:`,
          smsErr
        );
      }
    }

    revalidatePath(`/order/${orderId}`);
    return {
      success: true,
      message: `Umethibitisha kupokea: ${updatedItem.name}`,
    };
  } catch (error: unknown) {
    console.error("Item delivery completion system error:", error);
    return {
      success: false,
      message: "Imeshindikana kusasisha hali ya bidhaa.",
    };
  }
}

/**
 * 2. MASTER FALLBACK ACTION: MARKS THE ENTIRE ORDER CLOSED AT ONCE
 * Kept intact to preserve backward compatibility for your existing single-button dashboard panels
 */
export async function markOrderAsDelivered(orderId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Mark all related product items as true
      await tx.orderItem.updateMany({
        where: { orderId: orderId },
        data: { isDelivered: true, deliveredAt: new Date() },
      });

      // 2. Mark the parent order header as true
      await tx.order.update({
        where: { id: orderId },
        data: { isDelivered: true, deliveredAt: new Date() },
      });
    });

    revalidatePath(`/order/${orderId}`);
    return { success: true, message: "Agizo zima limesasishwa kuwa limefika!" };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Imeshindikana kusasisha hali ya mzigo.",
    };
  }
}
