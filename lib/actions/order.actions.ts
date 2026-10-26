"use server";

import { convertToPlainObject, formatError, isRedirectError } from "../utils";
import { settleOrder } from "@/lib/order-fulfillment";
import { confirmDelivery, openOrderDispute } from "@/lib/order-delivery";
import { auth } from "@/auth";
import {
  requireAdmin as requireOrderAdmin,
  requireSupplierScope,
} from "@/lib/auth-guard";
import { getMyCart } from "./cart.actions";
import { getUserById } from "./user.actions";
import { insertOrderSchema } from "../validators";
import { prisma } from "@/db/prisma";
import { CartItem } from "@/types";
import { revalidatePath } from "next/cache";
import { PAGE_SIZE } from "../constants";
import { Prisma } from "@prisma/client";
import { PaymentResult } from "@/types";
import { calcPriceWithTiers } from "@/lib/cart-pricing";
import { getBuyNowQuote } from "@/lib/buy-now-pricing";
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

    // Refresh legacy carts as well: prices and supplier ownership are database facts.
    const totals = await calcPriceWithTiers(cart.items as CartItem[]);
    // Create order object
    const order = insertOrderSchema.parse({
      userId: user.id,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod,
      ...totals,
    });

    // Create a transaction to create order and order items in database
    const insertedOrderId = await prisma.$transaction(async (tx) => {
      // Create order
      const insertedOrder = await tx.order.create({ data: order });
      // Create order items from the cart items
      for (const item of cart.items as CartItem[]) {
        const seller = await tx.supplier.findUnique({
          where: { id: item.supplierId },
          select: { name: true, companyName: true },
        });
        if (!seller) throw new Error("Supplier unavailable");
        const orderItemData = { ...item };

        // @ts-expect-error dont needed
        delete orderItemData.priceTiers;

        await tx.orderItem.create({
          data: {
            ...orderItemData,
            price: item.price,
            status: "PREPARING",
            supplierId: item?.supplierId,
            supplierName: seller.companyName || seller.name,
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
    const cartLike = await getBuyNowQuote(productId, qty);

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
        const seller = await tx.supplier.findUnique({
          where: { id: it.supplierId },
          select: { name: true, companyName: true },
        });
        if (!seller) throw new Error("Supplier unavailable");
        await tx.orderItem.create({
          data: {
            productId: it.productId,
            name: it.name,
            image: it.image,
            price: it.price,
            supplierId: it.supplierId,
            supplierName: seller.companyName || seller.name,
            qty: it.qty,
            status: "PREPARING",
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const data = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: session.user.id,
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
  const session = await requireOrderAdmin();
  if (paymentResult)
    throw new Error("Digital payments require provider verification");
  const settled = await settleOrder(orderId, {
    gateway: "COD",
    actorId: session.user.id!,
  });
  if (!settled) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { isPaid: true, paymentMethod: true },
    });
    if (
      !order?.isPaid ||
      !["CashOnDelivery", "COD", "Cash On Delivery"].includes(
        order.paymentMethod,
      )
    )
      throw new Error("Payment state changed; reconcile order");
  }
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
  if (!session?.user?.id) throw new Error("User is not authorized");

  const data = await prisma.order.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      createdAt: true,
      totalPrice: true,
      paymentStatus: true,
      isPaid: true,
      orderitems: { select: { isDelivered: true } },
      isDelivered: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.order.count({
    where: { userId: session.user.id },
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
// export async function getOrderSummary(supplierId: string) {
//   try {
//     if (!supplierId) throw new Error("Supplier ID is required");

//     // 🟢 OPTIMIZATION 1: Count active vendor catalogs instantly without pulling data rows
//     const productsCount = await prisma.product.count({
//       where: { supplierId },
//     });

//     // 🟢 OPTIMIZATION 2: Run mathematical summaries inside PostgreSQL (Price * Qty)
//     // Pull active paid order items associated with this vendor
//     const orderItemsRaw = await prisma.orderItem.findMany({
//       where: {
//         supplierId,
//         order: { isPaid: true }, // Only track cleared financial transactions
//       },
//       select: {
//         orderId: true,
//         price: true,
//         qty: true,
//         order: { select: { userId: true } },
//       },
//     });

//     // Compute metrics from the lean payload batch smoothly
//     const uniqueOrderIds = new Set(orderItemsRaw.map((item) => item.orderId));
//     const uniqueUserIds = new Set(
//       orderItemsRaw.map((item) => item.order.userId)
//     );

//     const ordersCount = uniqueOrderIds.size;
//     const usersCount = uniqueUserIds.size;

//     const totalSales = orderItemsRaw.reduce(
//       (sum, item) => sum + Number(item.price) * item.qty,
//       0
//     );

//     // 🟢 OPTIMIZATION 3: Group monthly metrics cleanly using a raw query pass matching your PostgreSQL configuration
//     const salesByMonth: Record<string, number> = {};

//     // Fallback date distribution loop context handler
//     for (const item of orderItemsRaw) {
//       const parentOrder = await prisma.order.findUnique({
//         where: { id: item.orderId },
//         select: { createdAt: true },
//       });
//       if (!parentOrder) continue;

//       const monthLabel = parentOrder.createdAt.toLocaleDateString("en-US", {
//         month: "2-digit",
//         year: "2-digit",
//       });
//       salesByMonth[monthLabel] =
//         (salesByMonth[monthLabel] || 0) + Number(item.price) * item.qty;
//     }

//     const salesData = Object.entries(salesByMonth).map(
//       ([month, monthlyTotal]) => ({
//         month,
//         totalSales: monthlyTotal,
//       })
//     );

//     // 🟢 OPTIMIZATION 4: Fetch only the last 6 records instead of sorting full-table memory logs
//     const latestSales = await prisma.order.findMany({
//       where: { id: { in: Array.from(uniqueOrderIds) } },
//       orderBy: { createdAt: "desc" },
//       include: { user: { select: { name: true } } },
//       take: 6,
//     });

//     return {
//       ordersCount,
//       productsCount,
//       usersCount,
//       totalSales,
//       latestSales,
//       salesData,
//     };
//   } catch (error) {
//     console.error("Failed to compile order analytics summary");
//     return {
//       ordersCount: 0,
//       productsCount: 0,
//       usersCount: 0,
//       totalSales: 0,
//       latestSales: [],
//       salesData: [],
//     };
//   }
// }

export async function getOrderSummary(supplierId: string) {
  try {
    const supplierWallet = await requireSupplierScope({ userId: supplierId });
    const supplierIdid = supplierWallet.id;

    const productsCount = await prisma.product.count({
      where: { supplierId: supplierIdid },
    });

    const orderItems = await prisma.orderItem.findMany({
      where: {
        supplierId: supplierIdid,
        order: { isPaid: true },
      },
      select: {
        // id: true,
        orderId: true,
        price: true,
        qty: true,
        payoutStatus: true,
        isDelivered: true,
        order: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: {
        order: { createdAt: "desc" },
      },
    });

    //console.log("Order Items: ", orderItems);

    const uniqueOrderIds = new Set(orderItems.map((i) => i.orderId));
    const uniqueUserIds = new Set(orderItems.map((i) => i.order.userId));

    //console.log("uniqueOrderIds: ", uniqueOrderIds);

    const totalSales = orderItems.reduce(
      (sum, item) => sum + Number(item.price) * item.qty,
      0,
    );

    // const pendingEscrow = orderItems
    //   .filter((i) => i.payoutStatus === "ESCROW")
    //   .reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

    const deliveredValue = orderItems
      .filter((i) => i.isDelivered)
      .reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

    //START: GRAPH YA MAUZO YA MWEZI
    const salesByMonth: Record<string, number> = {};

    for (const item of orderItems) {
      const month = item.order.createdAt.toLocaleDateString("en-US", {
        month: "2-digit",
        year: "2-digit",
      });

      salesByMonth[month] =
        (salesByMonth[month] || 0) + Number(item.price) * item.qty;
    }

    const salesData = Object.entries(salesByMonth)
      .map(([month, totalSales]) => ({ month, totalSales }))
      .sort((a, b) => {
        const [am, ay] = a.month.split("/").map(Number);
        const [bm, by] = b.month.split("/").map(Number);
        return ay - by || am - bm;
      });

    const latestSalesMap = new Map();

    for (const item of orderItems) {
      if (!latestSalesMap.has(item.orderId)) {
        latestSalesMap.set(item.orderId, {
          id: item.order.id,
          createdAt: item.order.createdAt,
          totalPrice: Number(item.price) * item.qty,
          user: item.order.user,
        });
      } else {
        latestSalesMap.get(item.orderId).totalPrice +=
          Number(item.price) * item.qty;
      }
    }

    //END: GRAPH YA MAUZO YA MWEZI
    //START: GRAPH YA MAUZO YA SIKU

    // 1. Group raw data points by local calendar days
    const salesByDay: Record<string, number> = {};

    for (const item of orderItems) {
      const day = item.order.createdAt.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      });

      salesByDay[day] = (salesByDay[day] || 0) + Number(item.price) * item.qty;
    }

    // 2. Format into an array and strictly sort chronologically (Oldest -> Newest)
    const salesByDayData = Object.entries(salesByDay)
      .map(([day, totalSales]) => ({ day, totalSales }))
      .sort((a, b) => {
        // Explicitly split MM/DD/YY to guarantee robust cross-platform parsing
        const [monthA, dayA, yearA] = a.day.split("/").map(Number);
        const [monthB, dayB, yearB] = b.day.split("/").map(Number);

        // Add century prefix to 2-digit years (e.g., 26 -> 2026)
        const dateA = new Date(2000 + yearA, monthA - 1, dayA).getTime();
        const dateB = new Date(2000 + yearB, monthB - 1, dayB).getTime();

        return dateA - dateB;
      });

    //END: GRAPH YA MAUZO YA SIKU

    const rejectedOrdersCount = await prisma.orderItem.count({
      where: {
        supplierId: supplierIdid,
        status: { in: ["REJECTED", "RETURNED"] },
      },
    });

    const dispatchedCount = await prisma.orderItem.count({
      where: {
        supplierId: supplierIdid,
        status: "DISPATCHED",
        isDelivered: false,
      },
    });

    const awaitingDispatchCount = await prisma.orderItem.count({
      where: {
        supplierId: supplierIdid,
        status: { in: ["PAID", "PREPARING"] },
        isDelivered: false,
        order: { isPaid: true },
      },
    });

    const awaitingConfirmationCount = await prisma.orderItem.count({
      where: {
        supplierId: supplierIdid,
        status: "DISPATCHED",
        isDelivered: false,
        order: { isPaid: true },
      },
    });

    const latestSales = Array.from(latestSalesMap.values()).slice(0, 6);

    return {
      available: true,
      ordersCount: uniqueOrderIds.size,
      productsCount,
      rejectedOrdersCount,
      dispatchedCount,
      awaitingDispatchCount,
      awaitingConfirmationCount,
      usersCount: uniqueUserIds.size,
      totalSales,
      // pendingEscrow,
      deliveredValue,
      latestSales,
      salesData,
      salesByDayData,
      pendingEscrow: Number(supplierWallet?.pendingBalance || 0),
      walletBalance: Number(supplierWallet?.walletBalance || 0),
    };
  } catch {
    console.error("Failed to compile order analytics summary");
    return {
      available: false,
      ordersCount: 0,
      productsCount: 0,
      rejectedOrdersCount: 0,
      dispatchedCount: 0,
      awaitingDispatchCount: 0,
      awaitingConfirmationCount: 0,
      usersCount: 0,
      totalSales: 0,
      pendingEscrow: 0,
      deliveredValue: 0,
      latestSales: [],
      salesData: [],
      salesByDayData: [],
    };
  }
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
  await requireOrderAdmin();
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
    await requireOrderAdmin();
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
  return markOrderAsDelivered(orderId);
}

// 🟢 FIND AND REPLACE / ADD THESE TWO METHODS INSIDE: lib/actions/order.actions.ts

/**
 * 1. MARK A SPECIFIC PRODUCT LINE ITEM AS ARRIVED
 * Uses the composite index signature parameters to identify rows cleanly without errors
 */
export async function markOrderItemAsDelivered(
  orderId: string,
  productId: string,
) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    await confirmDelivery(orderId, productId, {
      kind: "buyer",
      userId: session.user.id,
    });
    revalidatePath(`/order/${orderId}`);
    return { success: true, message: "Bidhaa imethibitishwa." };
  } catch {
    return {
      success: false,
      message: "Imeshindikana kusasisha hali ya bidhaa.",
    };
  }
}

export async function markOrderAsDelivered(orderId: string) {
  try {
    const session = await requireOrderAdmin();
    await confirmDelivery(orderId, undefined, {
      kind: "admin",
      userId: session.user.id!,
    });
    revalidatePath(`/order/${orderId}`);
    return { success: true, message: "Agizo zima limesasishwa kuwa limefika!" };
  } catch {
    return {
      success: false,
      message: "Imeshindikana kusasisha hali ya mzigo.",
    };
  }
}

// export async function getSupplierOrderItems({
//   supplierId,
//   page = 1,
//   limit = 10,
//   query = "",
// }: {
//   supplierId: string;
//   page?: number;
//   limit?: number;
//   query?: string;
// }) {
//   try {
//     const skip = (page - 1) * limit;

//     // Filter by buyer name or order tracking ID securely
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const whereClause: any = {
//       supplierId,
//       order: {
//         isPaid: true, // Only show cleared paid items on the vendor dashboard
//         OR: [
//           { id: query ? { contains: query, mode: "insensitive" } : undefined },
//           {
//             user: {
//               name: query
//                 ? { contains: query, mode: "insensitive" }
//                 : undefined,
//             },
//           },
//         ].filter(Boolean),
//       },
//     };

//     const data = await prisma.orderItem.findMany({
//       where: whereClause,
//       select: {
//         orderId: true,
//         productId: true,
//         qty: true,
//         price: true,
//         name: true,
//         image: true,
//         slug: true,
//         supplierId: true,
//         isDelivered: true,
//         deliveredAt: true,
//         payoutStatus: true,
//         status: true,
//         dispatchedAt: true,
//         dispatchNote: true,
//         buyerDeliveryComment: true,
//         buyerDeliveryRating: true,
//         rejectedAt: true,
//         rejectionReason: true,
//         order: {
//           include: {
//             user: {
//               select: {
//                 id: true,
//                 name: true,
//                 phone: true,
//                 paymentPhone: true,
//               },
//             },
//           },
//         },
//       },
//       orderBy: { order: { createdAt: "desc" } },
//       take: limit,
//       skip,
//     });

//     const totalCount = await prisma.orderItem.count({ where: whereClause });

//     return {
//       data,
//       totalPages: Math.ceil(totalCount / limit),
//     };
//   } catch (error) {
//     console.error("Failed to query supplier split items:", error);
//     return { data: [], totalPages: 0 };
//   }
// }

export async function getSupplierOrderItems({
  supplierId,
  page = 1,
  limit = 10,
  query = "",
}: {
  supplierId: string;
  page?: number;
  limit?: number;
  query?: string;
}) {
  try {
    const supplier = await requireSupplierScope({ id: supplierId });
    const skip = (page - 1) * limit;

    const whereClause = {
      supplierId: supplier.id,
      order: {
        isPaid: true,
        ...(query
          ? {
              OR: [
                { id: { contains: query, mode: "insensitive" as const } },
                {
                  user: {
                    name: { contains: query, mode: "insensitive" as const },
                  },
                },
              ],
            }
          : {}),
      },
    };

    const [data, totalCount, stats] = await prisma.$transaction([
      prisma.orderItem.findMany({
        where: whereClause,
        select: {
          orderId: true,
          productId: true,
          qty: true,
          price: true,
          name: true,
          image: true,
          slug: true,
          supplierId: true,
          isDelivered: true,
          deliveredAt: true,
          payoutStatus: true,
          status: true,
          dispatchedAt: true,
          dispatchNote: true,
          buyerDeliveryComment: true,
          buyerDeliveryRating: true,
          rejectedAt: true,
          rejectionReason: true,
          order: {
            select: {
              id: true,
              createdAt: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { order: { createdAt: "desc" } },
        take: limit,
        skip,
      }),

      prisma.orderItem.count({ where: whereClause }),

      prisma.orderItem.groupBy({
        by: ["status"],
        where: {
          supplierId: supplier.id,
          order: { isPaid: true },
        },
        _count: { status: true },
      }),
    ]);

    const statusCounts = stats.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      data,
      totalPages: Math.ceil(totalCount / limit),
      statusCounts,
      totalCount,
    };
  } catch (error) {
    console.error("Failed to query supplier split items:", error);
    return { data: [], totalPages: 0, statusCounts: {}, totalCount: 0 };
  }
}

export async function confirmOrderItemDeliveryWithFeedback({
  orderId,
  productId,
  rating,
  comment,
}: {
  orderId: string;
  productId: string;
  rating: number;
  comment?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      (comment?.length ?? 0) > 2000
    )
      throw new Error("Invalid feedback");
    await confirmDelivery(
      orderId,
      productId,
      { kind: "buyer", userId: session.user.id },
      { rating, comment: comment || "" },
    );
    revalidatePath(`/order/${orderId}`);
    revalidatePath("/supplier/orders");
    revalidatePath("/supplier/overview");
    return { success: true, message: "Bidhaa imethibitishwa." };
  } catch {
    return { success: false, message: "Imeshindikana kuthibitisha delivery." };
  }
}

export async function reportOrderItemProblem({
  orderId,
  productId,
  reason,
}: {
  orderId: string;
  productId: string;
  reason: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    if (
      typeof reason !== "string" ||
      reason.trim().length < 10 ||
      reason.length > 2000
    )
      throw new Error("Invalid reason");
    await openOrderDispute(orderId, productId, session.user.id, reason.trim());
    revalidatePath(`/order/${orderId}`);
    revalidatePath("/supplier/orders");
    revalidatePath("/supplier/overview");
    return {
      success: true,
      message:
        "Tumepokea taarifa yako. Admin atakagua tatizo hili kabla ya malipo kutolewa.",
    };
  } catch {
    return {
      success: false,
      message: "Imeshindikana kutuma taarifa ya tatizo.",
    };
  }
}
