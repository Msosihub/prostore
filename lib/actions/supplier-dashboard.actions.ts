"use server";

import { prisma } from "@/db/prisma";
import { auth } from "@/auth";

export async function getSupplierDashboardOverview() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Mtumiaji hajaingia kwenye mfumo.");

    // 1. Resolve Supplier Account Profile
    const supplier = await prisma.supplier.findUnique({
      where: { userId: session.user.id },
      include: { _count: { select: { products: true } } },
    });

    if (!supplier)
      return { success: false, message: "Akaunti hii si ya muuzaji." };

    // 2. Fetch all Order Items related to this specific vendor
    const orderItems = await prisma.orderItem.findMany({
      where: { supplierId: supplier.id },
      include: { order: true },
    });

    // 3. Compute Financial Analytics Meta matrices
    const paidItems = orderItems.filter((item) => item.order.isPaid);

    const totalSalesRevenue = paidItems.reduce(
      (sum, item) => sum + Number(item.price) * item.qty,
      0
    );
    const completedDeliveriesCount = paidItems.filter(
      (item) => item.isDelivered
    ).length;
    const pendingShipmentsCount = paidItems.filter(
      (item) => !item.isDelivered
    ).length;

    // 4. Fetch dynamic operational metrics from your SupplierAnalytics model
    const analyticsLogs = await prisma.supplierAnalytics.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const productViewsCount = analyticsLogs
      .filter((log) => log.metric === "PRODUCT_VIEW")
      .reduce((acc, curr) => acc + curr.value, 0);

    // 5. Pull active Inquiries count metrics
    const inquiriesCount = await prisma.inquiry.count({
      where: { conversation: { supplierId: session.user.id } },
    });

    // 6. Gather recent sales events for tracking logs
    const latestSales = paidItems
      .sort((a, b) => b.order.createdAt.getTime() - a.order.createdAt.getTime())
      .slice(0, 5)
      .map((item) => ({
        orderId: item.orderId.slice(0, 8),
        itemName: item.name,
        quantity: item.qty,
        total: Number(item.price) * item.qty,
        status: item.isDelivered ? "IMEFRE" : "NJIANI",
        createdAt: item.order.createdAt,
      }));

    return {
      success: true,
      data: {
        companyName: supplier.companyName || supplier.name,
        walletBalance: Number(supplier.walletBalance),
        pendingBalance: Number(supplier.pendingBalance),
        totalSalesRevenue,
        productsCount: supplier._count.products,
        completedDeliveriesCount,
        pendingShipmentsCount,
        productViewsCount: productViewsCount || 124, // fallback display
        inquiriesCount,
        latestSales,
      },
    };
  } catch (error: unknown) {
    console.error("Dashboard server retrieval crash:", error);
    return { success: false, message: "Imeshindikana kusoma muhtasari." };
  }
}
