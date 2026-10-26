import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { withdrawalBalance } from "@/lib/money-review";
import { z } from "zod";
export async function moneyReviewView(
  scope: "admin" | "supplier" | "buyer",
  params: { page?: string; state?: string; id?: string } = {},
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return prisma.$transaction(
    async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true },
      });
      if (
        !actor ||
        (scope === "admin" && actor.role !== "ADMIN") ||
        (scope === "supplier" && actor.role !== "SUPPLIER")
      )
        throw new Error("Unauthorized");
      const supplier =
        scope === "supplier"
          ? await tx.supplier.findUnique({
              where: { userId: actor.id },
              select: { id: true },
            })
          : null;
      if (scope === "supplier" && !supplier) throw new Error("Unauthorized");
      const where = {
        ...(scope === "supplier"
          ? { supplierId: supplier!.id, kind: "WITHDRAWAL" }
          : scope === "buyer"
            ? { actorId: actor.id, kind: "REFUND" }
            : {}),
        ...(params.id ? { id: z.string().uuid().parse(params.id) } : {}),
        ...([
          "REQUESTED",
          "UNDER_REVIEW",
          "APPROVED",
          "REJECTED",
          "CANCELLED",
        ].includes(params.state ?? "")
          ? { state: params.state }
          : {}),
      };
      const total = await tx.moneyReviewCase.count({ where });
      const page = Math.min(
        Math.max(1, Number(params.page) || 1),
        Math.max(1, Math.ceil(total / 20)),
      );
      const cases = await tx.moneyReviewCase.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: 20,
        skip: (Math.floor(page) - 1) * 20,
        select: {
          id: true,
          supplierId: true,
          actorId: true,
          kind: true,
          state: true,
          amount: true,
          quantity: true,
          orderId: true,
          productId: true,
          paymentVerified: true,
          reason: true,
          createdAt: true,
          events: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: { id: true, state: true, reason: true, createdAt: true },
            take: 50,
          },
        },
      });
      const balance = supplier
        ? await withdrawalBalance(tx, supplier.id)
        : null;
      const identities =
        scope === "admin"
          ? await tx.supplier.findMany({
              where: { id: { in: cases.map((c) => c.supplierId) } },
              select: { id: true, name: true, walletBalance: true },
            })
          : [];
      const detail = scope === "admin" && params.id ? cases[0] : null;
      const detailBalance = detail
        ? await withdrawalBalance(tx, detail.supplierId)
        : null;
      const detailItem =
        detail?.orderId && detail.productId
          ? await tx.orderItem.findUnique({
              where: {
                orderId_productId: {
                  orderId: detail.orderId,
                  productId: detail.productId,
                },
              },
              select: { status: true, payoutStatus: true, isDelivered: true },
            })
          : null;
      const dispute =
        detail?.orderId && detail.productId
          ? await tx.returnRequest.findUnique({
              where: {
                orderId_productId: {
                  orderId: detail.orderId,
                  productId: detail.productId,
                },
              },
              select: { status: true },
            })
          : null;
      return {
        actorId: actor.id,
        cases: cases.map(({ supplierId, actorId, ...c }) => ({
          ...c,
          amount: c.amount.toFixed(2),
          adminContext:
            scope === "admin"
              ? {
                  supplierId,
                  actorId,
                  reserved: detailBalance?.reserved.toFixed(2),
                  available: detailBalance?.available.toFixed(2),
                  reconciliationBlocked: detailBalance?.blocked,
                  itemState: detailItem
                    ? `${detailItem.status} / ${detailItem.payoutStatus}`
                    : null,
                  disputeState: dispute?.status ?? null,
                  sellerName:
                    identities.find((s) => s.id === supplierId)?.name ??
                    "Unavailable",
                  wallet: String(
                    identities.find((s) => s.id === supplierId)
                      ?.walletBalance ?? "Unavailable",
                  ),
                }
              : null,
        })),
        total,
        page: Math.floor(page),
        balance: balance
          ? {
              wallet: balance.wallet.toFixed(2),
              reserved: balance.reserved.toFixed(2),
              available: balance.available.toFixed(2),
              blocked: balance.blocked,
            }
          : null,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function refundableOrderItems() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id, isPaid: true },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      orderitems: { select: { productId: true, name: true, qty: true } },
    },
  });
  return orders.flatMap((o) =>
    o.orderitems.map((i) => ({ orderId: o.id, ...i })),
  );
}
