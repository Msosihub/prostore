import { assertDryRun } from "@/lib/worker-options";
import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { getZenopayStatus } from "@/lib/zenopay";
import { fulfillOrder } from "@/lib/order-fulfillment";
import { COD_METHODS, PESAPAL_METHODS } from "@/lib/payment-methods";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
export function boundAttempt(result: unknown): string | undefined {
  if (
    result &&
    typeof result === "object" &&
    "zenopay_order_id" in result &&
    typeof result.zenopay_order_id === "string"
  )
    return result.zenopay_order_id;
}

export async function reservePayment(
  orderId: string,
  userId: string,
  reference: string,
  amount: number,
) {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: {
        id: orderId,
        userId,
        isPaid: false,
        totalPrice: amount,
        paymentResult: { equals: Prisma.AnyNull },
        paymentMethod: {
          notIn: [...COD_METHODS, ...PESAPAL_METHODS],
        },
      },
      data: {
        paymentMethod: "ZENOPAY",
        paymentStatus: "PENDING",
        paymentResult: { zenopay_order_id: reference },
      },
    });
    if (!claim.count) return false;
    await tx.paymentAttempt.create({
      data: {
        orderId,
        providerOrderId: reference,
        amount,
        state: "AMBIGUOUS",
        events: {
          create: { state: "AMBIGUOUS", reason: "COLLECTION_RESERVED" },
        },
      },
    });
    return true;
  });
}

// Adoption binds only the reference already saved on the order. Never creates a charge.
async function adoptAttempt(orderId: string, reference: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId}::uuid FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (
      !order ||
      order.paymentMethod !== "ZENOPAY" ||
      boundAttempt(order.paymentResult) !== reference
    )
      throw new Error("Unknown payment attempt");
    const existing = await tx.paymentAttempt.findUnique({ where: { orderId } });
    if (existing) {
      if (
        existing.providerOrderId !== reference ||
        Number(existing.amount) !== Number(order.totalPrice)
      )
        throw new Error("Payment binding mismatch");
      return existing;
    }
    return tx.paymentAttempt.create({
      data: {
        orderId,
        providerOrderId: reference,
        amount: order.totalPrice,
        legacyPaid: order.isPaid,
        state: order.isPaid ? "REVIEW" : "AMBIGUOUS",
        events: {
          create: {
            state: order.isPaid ? "REVIEW" : "AMBIGUOUS",
            reason: "LEGACY_REFERENCE_ADOPTED",
          },
        },
      },
    });
  });
}

async function record(
  tx: Tx,
  id: string,
  state: string,
  reason: string,
  extra: Prisma.PaymentAttemptUpdateInput = {},
) {
  await tx.paymentAttempt.update({
    where: { id },
    data: { ...extra, state, events: { create: { state, reason } } },
  });
}

async function finish(
  id: string,
  token: string,
  orderId: string,
  state: "SETTLED" | "REVIEW",
) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "PaymentAttempt" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const current = await tx.paymentAttempt.findUniqueOrThrow({
      where: { id },
    });
    if (current.leaseToken !== token || current.state === "SETTLED") return;
    await record(
      tx,
      id,
      state,
      state === "SETTLED"
        ? "LOCAL_SETTLEMENT_COMMITTED"
        : "LOCAL_SETTLEMENT_REQUIRES_REVIEW",
    );
    if (state === "REVIEW")
      await tx.order.updateMany({
        where: { id: orderId, isPaid: false },
        data: { paymentStatus: "REQUIRES_REVIEW" },
      });
  });
}

// All callers share a persisted lease and cooldown. No network call holds a DB transaction.
export async function recoverPayment(
  orderId: string,
  reference: string,
  requireFresh = false,
) {
  const attempt = await adoptAttempt(orderId, reference);
  if (attempt.state === "SETTLED") return "COMPLETED";
  const token = randomUUID();
  const now = new Date();
  const claimed = await prisma.paymentAttempt.updateMany({
    where: {
      id: attempt.id,
      nextCheckAt: { lte: now },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
    },
    data: {
      leaseToken: token,
      leaseUntil: new Date(now.getTime() + 90000),
      nextCheckAt: new Date(now.getTime() + 30000),
    },
  });
  if (!claimed.count && requireFresh)
    throw new Error("Verification busy; retry notification");
  if (!claimed.count)
    return attempt.state === "VERIFIED" || attempt.state === "REVIEW"
      ? "REQUIRES_REVIEW"
      : attempt.state;
  try {
    const payment =
      attempt.verifiedAt && attempt.providerReference
        ? {
            order_id: reference,
            amount: Number(attempt.amount),
            payment_status: "COMPLETED",
            reference: attempt.providerReference,
          }
        : await getZenopayStatus(reference);
    // Validate again here so alternate provider adapters cannot weaken the contract.
    if (
      payment.order_id !== reference ||
      payment.amount !== Number(attempt.amount) ||
      !["PENDING", "FAILED", "COMPLETED"].includes(payment.payment_status) ||
      (payment.payment_status === "COMPLETED" && !payment.reference?.trim())
    )
      throw new Error("Payment verification mismatch");
    const verified = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PaymentAttempt" WHERE "id" = ${attempt.id}::uuid FOR UPDATE`;
      const current = await tx.paymentAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
      if (current.leaseToken !== token) throw new Error("Stale verification");
      if (current.state === "SETTLED") return false;
      if (payment.payment_status === "COMPLETED") {
        if (
          current.providerReference &&
          current.providerReference !== payment.reference
        )
          throw new Error("Payment reference changed");
        await record(
          tx,
          attempt.id,
          "VERIFIED",
          attempt.verifiedAt ? "VERIFIED_PROOF_RETRY" : "PROVIDER_CONFIRMED",
          {
            providerReference: payment.reference,
            verifiedAt: current.verifiedAt ?? new Date(),
          },
        );
        await tx.order.updateMany({
          where: { id: orderId, isPaid: false },
          data: { paymentStatus: "REQUIRES_REVIEW" },
        });
        return true;
      }
      // A later pending/failed response cannot erase previously verified money.
      if (!current.verifiedAt) {
        const state =
          current.state === "FAILED" ? "FAILED" : payment.payment_status;
        await record(tx, attempt.id, state, "PROVIDER_STATUS");
        if (state === "FAILED")
          await tx.order.updateMany({
            where: { id: orderId, isPaid: false },
            data: { paymentStatus: "FAILED" },
          });
      }
      return false;
    });
    if (verified) {
      // Existing paid legacy rows need an inventory audit, never a blind replay.
      const legacyPaid = attempt.legacyPaid;
      try {
        if (legacyPaid) throw new Error("Legacy paid order requires review");
        await fulfillOrder(
          orderId,
          reference,
          payment.reference!,
          payment.amount,
        );
        const settled = await prisma.order.findUniqueOrThrow({
          where: { id: orderId },
        });
        if (!settled.isPaid) throw new Error("Settlement unavailable");
        await finish(attempt.id, token, orderId, "SETTLED");
      } catch {
        await finish(attempt.id, token, orderId, "REVIEW");
      }
    }
  } catch {
    // Sanitized history only. Unknown/malformed provider results are never payment proof.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PaymentAttempt" WHERE "id" = ${attempt.id}::uuid FOR UPDATE`;
      const current = await tx.paymentAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
      if (current.leaseToken === token)
        await record(tx, attempt.id, current.state, "VERIFICATION_UNAVAILABLE");
    });
    throw new Error("Payment verification unavailable");
  } finally {
    await prisma.paymentAttempt.updateMany({
      where: { id: attempt.id, leaseToken: token },
      data: { leaseToken: null, leaseUntil: null },
    });
  }
  const current = await prisma.paymentAttempt.findUniqueOrThrow({
    where: { id: attempt.id },
  });
  return current.state === "SETTLED"
    ? "COMPLETED"
    : ["VERIFIED", "REVIEW"].includes(current.state)
      ? "REQUIRES_REVIEW"
      : current.state;
}

// Explicit operator use only; dry run is the default, no scheduler is enabled.
export async function reconciliationBatch({
  dryRun = true,
  limit = 20,
}: { dryRun?: boolean; limit?: number } = {}) {
  assertDryRun(dryRun);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
    throw new Error("Invalid batch size");
  const attempts = await prisma.paymentAttempt.findMany({
    where: { state: { not: "SETTLED" }, nextCheckAt: { lte: new Date() } },
    orderBy: [{ nextCheckAt: "asc" }, { id: "asc" }],
    take: limit,
    select: { orderId: true, providerOrderId: true, state: true },
  });
  const results = [];
  for (const row of attempts) {
    if (dryRun) results.push({ orderId: row.orderId, state: row.state });
    else {
      try {
        results.push({
          orderId: row.orderId,
          state: await recoverPayment(row.orderId, row.providerOrderId),
        });
      } catch {
        results.push({ orderId: row.orderId, state: "UNAVAILABLE" });
      }
    }
  }
  return results;
}
