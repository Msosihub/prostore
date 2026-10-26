import "server-only";
import { prisma } from "@/db/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { Prisma, ReturnRequestStatus } from "@prisma/client";

export function adminFilters(
  params: Record<string, string | string[] | undefined>,
) {
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const raw = value("page");
  return {
    page: /^\d{1,5}$/.test(raw) ? Math.max(1, Number(raw)) : 1,
    q: value("q").trim().slice(0, 100),
    status: value("status"),
  };
}

export async function getAdminOverview() {
  await requireAdmin();
  return prisma.$transaction(
    async (tx) => {
      const [
        orders,
        unpaid,
        paid,
        openDisputes,
        suppliers,
        unverified,
        pendingDocuments,
        balances,
        products,
      ] = await Promise.all([
        tx.order.count(),
        tx.order.count({ where: { isPaid: false } }),
        tx.order.aggregate({
          where: { isPaid: true },
          _sum: { totalPrice: true },
          _count: true,
        }),
        tx.returnRequest.count({
          where: { status: { in: ["REQUESTED", "APPROVED"] } },
        }),
        tx.supplier.count(),
        tx.supplier.count({ where: { isVerified: false } }),
        tx.supplierDocument.count({
          where: { verified: false, rejectionReason: null },
        }),
        tx.supplier.aggregate({
          _sum: { pendingBalance: true, walletBalance: true },
        }),
        tx.product.count(),
      ]);
      return {
        orders,
        unpaid,
        paidOrders: paid._count,
        paidTotal: String(paid._sum.totalPrice ?? 0),
        openDisputes,
        suppliers,
        unverified,
        pendingDocuments,
        products,
        pendingBalance: String(balances._sum.pendingBalance ?? 0),
        walletBalance: String(balances._sum.walletBalance ?? 0),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

export async function getAdminOrders(
  params: Record<string, string | string[] | undefined>,
) {
  await requireAdmin();
  const filters = adminFilters(params);
  const where: Prisma.OrderWhereInput = {};
  if (filters.status === "paid") where.isPaid = true;
  if (filters.status === "unpaid") where.isPaid = false;
  if (filters.status === "fulfillment") {
    where.isPaid = true;
    where.orderitems = { some: { isDelivered: false } };
  }
  if (filters.q) {
    // Search names or an exact order UUID; never interpolate SQL or expose buyer contacts.
    where.OR = [
      {
        orderitems: {
          some: { name: { contains: filters.q, mode: "insensitive" } },
        },
      },
    ];
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        filters.q,
      )
    )
      where.OR.push({ id: filters.q });
  }
  return prisma.$transaction(
    async (tx) => {
      const total = await tx.order.count({ where });
      const pages = Math.max(1, Math.ceil(total / 20));
      const page = Math.min(filters.page, pages);
      const items = await tx.order.findMany({
        where,
        take: 20,
        skip: (page - 1) * 20,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          createdAt: true,
          isPaid: true,
          totalPrice: true,
          paymentMethod: true,
          orderitems: {
            select: { isDelivered: true, supplierId: true, status: true },
          },
        },
      });
      return { items, total, page, pages, filters };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

export async function getAdminDisputes(
  params: Record<string, string | string[] | undefined>,
) {
  await requireAdmin();
  const filters = adminFilters(params);
  const status = Object.values(ReturnRequestStatus).find(
    (s) => s === filters.status,
  );
  const where: Prisma.ReturnRequestWhereInput = status
    ? { status }
    : filters.status === "all"
      ? {}
      : { status: { in: ["REQUESTED", "APPROVED"] } };
  return prisma.$transaction(
    async (tx) => {
      const total = await tx.returnRequest.count({ where });
      const pages = Math.max(1, Math.ceil(total / 20)),
        page = Math.min(filters.page, pages);
      const items = await tx.returnRequest.findMany({
        where,
        take: 20,
        skip: (page - 1) * 20,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          orderId: true,
          productId: true,
          supplierId: true,
          status: true,
          createdAt: true,
        },
      });
      return { items, total, pages, page, filters };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

export async function getAdminDocuments(
  params: Record<string, string | string[] | undefined>,
) {
  await requireAdmin();
  const filters = adminFilters(params);
  const where: Prisma.SupplierDocumentWhereInput = {};
  if (filters.status === "approved") where.verified = true;
  else if (filters.status === "rejected") {
    where.verified = false;
    where.rejectionReason = { not: null };
  } else if (filters.status !== "all") {
    where.verified = false;
    where.rejectionReason = null;
  }
  const supplierId =
    typeof params.supplierId === "string" ? params.supplierId : "";
  if (supplierId) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        supplierId,
      )
    )
      throw new Error("Invalid supplier filter");
    where.supplierId = supplierId;
  }
  return prisma.$transaction(
    async (tx) => {
      const total = await tx.supplierDocument.count({ where });
      const pages = Math.max(1, Math.ceil(total / 20)),
        page = Math.min(filters.page, pages);
      const items = await tx.supplierDocument.findMany({
        where,
        take: 20,
        skip: (page - 1) * 20,
        orderBy: [{ uploadedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          label: true,
          verified: true,
          rejectionReason: true,
          fileUrl: true,
          files: true,
          type: true,
          description: true,
          uploadedAt: true,
          supplier: { select: { name: true } },
        },
      });
      return { items, total, pages, page, filters, supplierId };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
