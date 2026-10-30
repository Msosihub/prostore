import "server-only";
import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
export const activeMoneyStates = ["REQUESTED", "UNDER_REVIEW", "APPROVED"];
export const moneyRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("WITHDRAWAL"),
    requestKey: z.string().uuid(),
    amount: z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/),
    reason: z.string().trim().min(5).max(500),
  }),
  z.object({
    kind: z.literal("REFUND"),
    requestKey: z.string().uuid(),
    orderId: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(1000000),
    reason: z.string().trim().min(5).max(500),
  }),
]);
export type MoneyRequest = z.infer<typeof moneyRequestSchema>;
export async function currentMoneyActor(tx: Tx, actorId: string) {
  const user = await tx.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true },
  });
  if (!user) throw new Error("Unauthorized");
  return user;
}
async function lockSupplier(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "Supplier" WHERE "id" = ${id}::uuid FOR UPDATE`;
  return tx.supplier.findUniqueOrThrow({ where: { id }, select: { id: true } });
}
export async function withdrawalBalance(tx: Tx, supplierId: string) {
  const supplier = await tx.supplier.findUniqueOrThrow({
    where: { id: supplierId },
  });
  const held = await tx.moneyReviewCase.aggregate({
    where: { supplierId, kind: "WITHDRAWAL", state: { in: activeMoneyStates } },
    _sum: { amount: true },
  });
  const reserved = new Prisma.Decimal(held._sum.amount ?? 0);
  const legacy = await tx.payoutRequest.count({
    where: {
      supplierId,
      status: { in: ["PENDING", "APPROVED", "TRANSFERRED"] },
    },
  });
  const refunds = await tx.moneyReviewCase.count({
    where: { supplierId, kind: "REFUND", state: { in: activeMoneyStates } },
  });
  return {
    wallet: new Prisma.Decimal(supplier.walletBalance),
    reserved,
    available: new Prisma.Decimal(supplier.walletBalance).sub(reserved),
    blocked: legacy > 0 || refunds > 0,
  };
}
// Holds are derived from active cases. Wallet/escrow/settlement ledgers are never debited here.
export async function submitMoneyRequest(actorId: string, raw: unknown) {
  const input = moneyRequestSchema.parse(raw);
  return prisma.$transaction(
    async (tx) => {
      // Serialize same-actor retries across both case types, before order/supplier locks.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actorId}, 19))`;
      const actor = await currentMoneyActor(tx, actorId);
      const previous = await tx.moneyReviewCase.findUnique({
        where: {
          actorId_requestKey: { actorId, requestKey: input.requestKey },
        },
      });
      if (previous) {
        if (
          previous.kind !== input.kind ||
          previous.reason !== input.reason ||
          (input.kind === "WITHDRAWAL"
            ? !previous.amount.equals(input.amount)
            : previous.orderId !== input.orderId ||
              previous.productId !== input.productId ||
              previous.quantity !== input.quantity)
        )
          throw new Error("Request key already used for different details");
        if (input.kind === "WITHDRAWAL" && actor.role !== "SUPPLIER")
          throw new Error("Unauthorized");
        return previous.id;
      }
      let supplierId: string,
        amount: Prisma.Decimal,
        paymentVerified = false;
      if (input.kind === "WITHDRAWAL") {
        if (actor.role !== "SUPPLIER") throw new Error("Unauthorized");
        const supplier = await tx.supplier.findUnique({
          where: { userId: actorId },
          select: { id: true },
        });
        if (!supplier) throw new Error("Unauthorized");
        supplierId = supplier.id;
        await lockSupplier(tx, supplierId);
        if ((await currentMoneyActor(tx, actorId)).role !== "SUPPLIER")
          throw new Error("Unauthorized");
        const balance = await withdrawalBalance(tx, supplierId);
        amount = new Prisma.Decimal(input.amount);
        if (!amount.gt(0) || balance.blocked || amount.gt(balance.available))
          throw new Error(
            "Withdrawal unavailable: check available funds, legacy payouts or open refund cases",
          );
      } else {
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${input.orderId}::uuid FOR UPDATE`;
        const order = await tx.order.findUnique({
          where: { id: input.orderId },
          include: { orderitems: true },
        });
        if (!order || order.userId !== actorId) throw new Error("Unauthorized");
        if (!order.isPaid)
          throw new Error(
            "Payment must be settled before requesting a refund review",
          );
        const item = order.orderitems.find(
          (i) => i.productId === input.productId,
        );
        if (!item?.supplierId) throw new Error("Item unavailable for review");
        supplierId = item.supplierId;
        await lockSupplier(tx, supplierId);
        const prior = await tx.moneyReviewCase.aggregate({
          where: {
            kind: "REFUND",
            orderId: order.id,
            productId: item.productId,
            state: { notIn: ["REJECTED", "CANCELLED"] },
          },
          _sum: { quantity: true },
        });
        if (input.quantity + (prior._sum.quantity ?? 0) > item.qty)
          throw new Error("Quantity exceeds remaining item allocation");
        const legacy = await tx.returnRequest.findUnique({
          where: {
            orderId_productId: { orderId: order.id, productId: item.productId },
          },
        });
        if (legacy && ["APPROVED", "REFUNDED"].includes(legacy.status))
          throw new Error(
            "Existing refund requires reconciliation before another request",
          );
        amount = new Prisma.Decimal(item.price).mul(input.quantity);
        if (!amount.gt(0) || amount.gt(order.totalPrice))
          throw new Error("Item amount requires reconciliation");
        const committed = await tx.moneyReviewCase.aggregate({
          where: {
            kind: "REFUND",
            orderId: order.id,
            state: { notIn: ["REJECTED", "CANCELLED"] },
          },
          _sum: { amount: true },
        });
        if (amount.add(committed._sum.amount ?? 0).gt(order.totalPrice))
          throw new Error("Requests exceed paid order total");
        const proof = await tx.paymentAttempt.findFirst({
          where: { orderId: order.id, state: "SETTLED", legacyPaid: false },
        });
        paymentVerified =
          !!proof && new Prisma.Decimal(proof.amount).equals(order.totalPrice);
        // Snapshot merchandise only. Fees, shipping, commissions and external execution remain gated.
      }
      const row = await tx.moneyReviewCase.create({
        data: {
          actorId,
          supplierId,
          requestKey: input.requestKey,
          kind: input.kind,
          amount,
          reason: input.reason,
          paymentVerified,
          ...(input.kind === "REFUND"
            ? {
                orderId: input.orderId,
                productId: input.productId,
                quantity: input.quantity,
              }
            : {}),
          events: {
            create: { actorId, state: "REQUESTED", reason: input.reason },
          },
        },
      });
      return row.id;
    },
    { timeout: 15000, maxWait: 10000 },
  );
}
export async function decideMoneyRequest(actorId: string, raw: unknown) {
  const input = z
    .object({
      id: z.string().uuid(),
      state: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"]),
      reason: z.string().trim().min(5).max(500),
    })
    .parse(raw);
  return prisma.$transaction(
    async (tx) => {
      const actor = await currentMoneyActor(tx, actorId);
      const initial = await tx.moneyReviewCase.findUnique({
        where: { id: input.id },
      });
      if (
        !initial ||
        (input.state === "CANCELLED"
          ? initial.actorId !== actorId
          : actor.role !== "ADMIN")
      )
        throw new Error("Unauthorized");
      if (
        initial.kind === "WITHDRAWAL" &&
        input.state === "CANCELLED" &&
        actor.role !== "SUPPLIER"
      )
        throw new Error("Unauthorized");
      // Same lock order as submission and delivery: order (if applicable), supplier, case.
      if (initial.orderId)
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${initial.orderId}::uuid FOR UPDATE`;
      await lockSupplier(tx, initial.supplierId);
      await tx.$queryRaw`SELECT "id" FROM "MoneyReviewCase" WHERE "id" = ${input.id}::uuid FOR UPDATE`;
      const fresh = await currentMoneyActor(tx, actorId);
      if (input.state !== "CANCELLED" && fresh.role !== "ADMIN")
        throw new Error("Unauthorized");
      if (
        input.state === "CANCELLED" &&
        initial.kind === "WITHDRAWAL" &&
        fresh.role !== "SUPPLIER"
      )
        throw new Error("Unauthorized");
      const row = await tx.moneyReviewCase.findUniqueOrThrow({
        where: { id: input.id },
      });
      if (row.state === input.state) return row.id;
      if (
        !["REQUESTED", "UNDER_REVIEW"].includes(row.state) &&
        !(
          row.state === "APPROVED" &&
          ["REJECTED", "CANCELLED"].includes(input.state)
        )
      )
        throw new Error(
          "Case is closed or approved; execution remains unavailable",
        );
      if (input.state === "APPROVED") {
        if (row.kind === "REFUND")
          throw new Error(
            "Refund approval unavailable until allocation policy and verified execution are configured",
          );
        const supplier = await tx.supplier.findUniqueOrThrow({
          where: { id: row.supplierId },
          select: { user: { select: { role: true } } },
        });
        if (supplier.user.role !== "SUPPLIER")
          throw new Error("Seller role requires review");
        const balance = await withdrawalBalance(tx, row.supplierId);
        if (balance.blocked || balance.available.lt(0))
          throw new Error("Funds or refund reconciliation required");
      }
      await tx.moneyReviewCase.update({
        where: { id: row.id },
        data: {
          state: input.state,
          events: {
            create: { actorId, state: input.state, reason: input.reason },
          },
        },
      });
      return row.id;
    },
    { timeout: 15000, maxWait: 10000 },
  );
}
