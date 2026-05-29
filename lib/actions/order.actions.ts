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
//     console.error("Failed to compile order analytics summary:", error);
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
    if (!supplierId) throw new Error("Supplier ID is required");

    const productsCount = await prisma.product.count({
      where: { supplierId },
    });

    const orderItems = await prisma.orderItem.findMany({
      where: {
        supplierId,
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
            totalPrice: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: {
        order: { createdAt: "desc" },
      },
    });

    const supplierWallet = await prisma.supplier.findUnique({
      where: { userId: supplierId },
      select: {
        pendingBalance: true,
        walletBalance: true,
      },
    });

    const uniqueOrderIds = new Set(orderItems.map((i) => i.orderId));
    const uniqueUserIds = new Set(orderItems.map((i) => i.order.userId));

    const totalSales = orderItems.reduce(
      (sum, item) => sum + Number(item.price) * item.qty,
      0
    );

    // const pendingEscrow = orderItems
    //   .filter((i) => i.payoutStatus === "ESCROW")
    //   .reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

    const deliveredValue = orderItems
      .filter((i) => i.isDelivered)
      .reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

    const salesByMonth: Record<string, number> = {};

    for (const item of orderItems) {
      const month = item.order.createdAt.toLocaleDateString("en-US", {
        month: "2-digit",
        year: "2-digit",
      });

      salesByMonth[month] =
        (salesByMonth[month] || 0) + Number(item.price) * item.qty;
    }

    const salesData = Object.entries(salesByMonth).map(
      ([month, totalSales]) => ({ month, totalSales })
    );

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

    const latestSales = Array.from(latestSalesMap.values()).slice(0, 6);

    return {
      ordersCount: uniqueOrderIds.size,
      productsCount,
      usersCount: uniqueUserIds.size,
      totalSales,
      // pendingEscrow,
      deliveredValue,
      latestSales,
      salesData,
      pendingEscrow: Number(supplierWallet?.pendingBalance || 0),
      walletBalance: Number(supplierWallet?.walletBalance || 0),
    };
  } catch (error) {
    console.error("Failed to compile order analytics summary:", error);
    return {
      ordersCount: 0,
      productsCount: 0,
      usersCount: 0,
      totalSales: 0,
      pendingEscrow: 0,
      deliveredValue: 0,
      latestSales: [],
      salesData: [],
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
// export async function markOrderItemAsDelivered(
//   orderId: string,
//   productId: string
// ) {
//   try {
//     // Update the targeted item row inside your composite table index layout structure
//     const updatedItem = await prisma.orderItem.update({
//       where: {
//         orderId_productId: {
//           orderId: orderId,
//           productId: productId,
//         },
//       },
//       data: {
//         isDelivered: true,
//         deliveredAt: new Date(),
//       },
//       include: {
//         order: {
//           include: {
//             orderitems: true, // Fetch sister rows to check for total delivery completeness
//             user: { select: { name: true } },
//           },
//         },
//       },
//     });

//     const currentOrder = updatedItem.order;
//     const cleanOrderId = currentOrder.id.slice(0, 8);
//     const buyerName = currentOrder.user?.name || "Mteja wetu";

//     // CASCADING CHECKER: If EVERY single product inside this cart is delivered, update the master Order row too
//     const allItemsDelivered = currentOrder.orderitems.every(
//       (item) => item.isDelivered
//     );

//     if (allItemsDelivered) {
//       await prisma.order.update({
//         where: { id: currentOrder.id },
//         data: {
//           isDelivered: true,
//           deliveredAt: new Date(),
//         },
//       });
//       // console.log(
//       //   `Global Order Header row #${cleanOrderId} closed automatically.`
//       // );
//     }

//     // Fetch the supplier's contact details to trigger an instant SMS alert
//     const productWithSupplier = await prisma.product.findUnique({
//       where: { id: productId },
//       select: {
//         supplier: {
//           select: { name: true, companyName: true, phone: true },
//         },
//       },
//     });

//     const supplier = productWithSupplier?.supplier;
//     if (supplier?.phone) {
//       const sName = supplier.companyName || supplier.name;
//       const supplierMsg = `Habari ${sName}, mteja (${buyerName}) amethibitisha kupokea bidhaa yako salama:\n- ${updatedItem.qty}x ${updatedItem.name}\nAgizo ID: #${cleanOrderId}.\nMalipo yako yanashughulikiwa sasa. Asante!`;

//       try {
//         await sendSms(supplier.phone, supplierMsg);
//       } catch (smsErr) {
//         console.error(
//           `Failed sending single item delivery SMS to supplier ${sName}:`,
//           smsErr
//         );
//       }
//     }

//     revalidatePath(`/order/${orderId}`);
//     return {
//       success: true,
//       message: `Umethibitisha kupokea: ${updatedItem.name}`,
//     };
//   } catch (error: unknown) {
//     console.error("Item delivery completion system error:", error);
//     return {
//       success: false,
//       message: "Imeshindikana kusasisha hali ya bidhaa.",
//     };
//   }
// }

export async function markOrderItemAsDelivered(
  orderId: string,
  productId: string
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({
        where: {
          orderId_productId: {
            orderId,
            productId,
          },
        },
        include: {
          order: {
            include: {
              orderitems: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      if (!item) throw new Error("Order item not found");

      const productWithSupplier = await tx.product.findUnique({
        where: { id: productId },
        select: {
          supplierId: true,
          supplier: {
            select: {
              name: true,
              companyName: true,
              phone: true,
            },
          },
        },
      });

      if (!productWithSupplier?.supplierId) {
        throw new Error("Supplier not found for product");
      }

      const currentOrder = item.order;
      const cleanOrderId = currentOrder.id.slice(0, 8);
      const buyerName = currentOrder.user?.name || "Mteja wetu";
      const supplier = productWithSupplier.supplier;
      const amount = Number(item.price) * item.qty;
      const releaseReference = `ESCROW_RELEASE_${orderId}_${productId}`;

      // If item was not delivered before, release escrow once.
      if (!item.isDelivered) {
        const existingRelease = await tx.supplierLedger.findUnique({
          where: { reference: releaseReference },
        });

        if (!existingRelease) {
          await tx.supplier.update({
            where: { id: productWithSupplier.supplierId },
            data: {
              pendingBalance: { decrement: amount },
              walletBalance: { increment: amount },
            },
          });

          await tx.supplierLedger.create({
            data: {
              supplierId: productWithSupplier.supplierId,
              orderId,
              // keep this null unless your OrderItem model has a real id field
              orderItemId: null,
              type: "ESCROW_RELEASE",
              amount,
              status: "COMPLETED",
              reference: releaseReference,
              metadata: {
                productId,
                productName: item.name,
                qty: item.qty,
                price: item.price,
                buyerName,
                cleanOrderId,
              },
            },
          });
        }

        await tx.orderItem.update({
          where: {
            orderId_productId: {
              orderId,
              productId,
            },
          },
          data: {
            isDelivered: true,
            deliveredAt: new Date(),
            payoutStatus: "PAID",
          },
        });
      }

      const allItemsDelivered = currentOrder.orderitems.every((orderItem) =>
        orderItem.productId === productId ? true : orderItem.isDelivered
      );

      if (allItemsDelivered) {
        await tx.order.update({
          where: { id: currentOrder.id },
          data: {
            isDelivered: true,
            deliveredAt: new Date(),
          },
        });
      }

      return {
        itemName: item.name,
        itemQty: item.qty,
        cleanOrderId,
        buyerName,
        supplierName: supplier?.companyName || supplier?.name || "Supplier",
        supplierPhone: supplier?.phone || null,
        alreadyDelivered: item.isDelivered,
      };
    });

    // Keep SMS outside transaction so failed SMS does not rollback money/order state.
    if (result.supplierPhone && !result.alreadyDelivered) {
      const supplierMsg = `Habari ${result.supplierName}, mteja (${result.buyerName}) amethibitisha kupokea bidhaa yako salama:\n- ${result.itemQty}x ${result.itemName}\nAgizo ID: #${result.cleanOrderId}.\nMalipo yako yametolewa kwenye wallet yako. Asante!`;

      try {
        await sendSms(result.supplierPhone, supplierMsg);
      } catch (smsErr) {
        console.error(
          `Failed sending single item delivery SMS to supplier ${result.supplierName}:`,
          smsErr
        );
      }
    }

    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: result.alreadyDelivered
        ? `${result.itemName} tayari ilithibitishwa.`
        : `Umethibitisha kupokea: ${result.itemName}`,
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
      // 1. Fetch the targeted order items with supplier data before modifying values
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderitems: true },
      });

      if (!order) throw new Error("Agizo halikupatikana.");

      // 2. Loop through items to calculate and apply balance shifts for each supplier
      for (const item of order.orderitems) {
        if (!item.isDelivered && item.supplierId) {
          const itemWholesaleTotal = Number(item.price) * item.qty;

          await tx.supplier.update({
            where: { id: item.supplierId },
            data: {
              pendingBalance: { decrement: itemWholesaleTotal },
              walletBalance: { increment: itemWholesaleTotal },
            },
          });
        }
      }

      // 3. Update all item row flags to delivered state
      await tx.orderItem.updateMany({
        where: { orderId: orderId },
        data: { isDelivered: true, deliveredAt: new Date() },
      });

      // 4. Close out the parent Order header
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

//for suppliers page
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
    const skip = (page - 1) * limit;

    // Filter by buyer name or order tracking ID securely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      supplierId,
      order: {
        isPaid: true, // Only show cleared paid items on the vendor dashboard
        OR: [
          { id: query ? { contains: query, mode: "insensitive" } : undefined },
          {
            user: {
              name: query
                ? { contains: query, mode: "insensitive" }
                : undefined,
            },
          },
        ].filter(Boolean),
      },
    };

    const data = await prisma.orderItem.findMany({
      where: whereClause,
      include: {
        order: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { order: { createdAt: "desc" } },
      take: limit,
      skip,
    });

    const totalCount = await prisma.orderItem.count({ where: whereClause });

    return {
      data,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (error) {
    console.error("Failed to query supplier split items:", error);
    return { data: [], totalPages: 0 };
  }
}
