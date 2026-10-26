import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/db/prisma";
import { sendSms } from "@/lib/africasTalking";
import { deliveryContact, deliverySmsRecipient } from "@/lib/fulfillment-view";
import type { OrderNotification } from "@prisma/client";

export const MAX_NOTIFICATION_ATTEMPTS = 5;
// This parser records only acceptance, never delivery. Raw response/recipient text is not retained.
export function smsAcceptance(
  value: unknown,
  recipient: string,
): {
  state: "ACCEPTED" | "RETRY" | "FAILED" | "SUPPRESSED" | "UNKNOWN";
  reason: string;
  messageId?: string;
} {
  const data = value as {
    SMSMessageData?: {
      Recipients?: Array<{
        number?: unknown;
        statusCode?: unknown;
        messageId?: unknown;
      }>;
    };
  };
  const recipients = data?.SMSMessageData?.Recipients;
  if (
    !Array.isArray(recipients) ||
    recipients.length !== 1 ||
    recipients[0].number !== recipient
  )
    return { state: "UNKNOWN", reason: "UNRECOGNIZED_RESPONSE" };
  const row = recipients[0];
  if (
    [100, 101, 102].includes(Number(row.statusCode)) &&
    typeof row.messageId === "string" &&
    row.messageId.length > 0 &&
    row.messageId.length <= 200
  )
    return {
      state: "ACCEPTED",
      reason: "PROVIDER_ACCEPTED",
      messageId: row.messageId,
    };
  if (Number(row.statusCode) === 406)
    return { state: "SUPPRESSED", reason: "PROVIDER_OPT_OUT" };
  if ([500, 501, 502].includes(Number(row.statusCode)))
    return { state: "RETRY", reason: "PROVIDER_REJECTED_TRANSIENT" };
  if ([401, 402, 403, 404, 405, 407].includes(Number(row.statusCode)))
    return { state: "FAILED", reason: "PROVIDER_REJECTED" };
  return { state: "UNKNOWN", reason: "UNRECOGNIZED_RESPONSE" };
}

async function render(
  row: OrderNotification,
): Promise<{ blocked: string } | { recipient: string; message: string }> {
  const order = await prisma.order.findUnique({
    where: { id: row.orderId },
    include: { user: true, orderitems: true },
  });
  if (!order?.isPaid) return { blocked: "ORDER_NOT_SETTLED" } as const;
  const item = row.productId
    ? order.orderitems.find((i) => i.productId === row.productId)
    : undefined;
  const sellerKind = row.kind.startsWith("SELLER_");
  const supplier = sellerKind
    ? await prisma.supplier.findUnique({ where: { id: row.targetId } })
    : null;
  if (
    sellerKind &&
    (!supplier || !order.orderitems.some((i) => i.supplierId === row.targetId))
  )
    return { blocked: "RECIPIENT_UNAVAILABLE" } as const;
  if (!sellerKind && row.targetId !== order.userId)
    return { blocked: "RECIPIENT_UNAVAILABLE" } as const;
  const owner = supplier?.userId
    ? await prisma.user.findUnique({
        where: { id: supplier.userId },
        select: { orderSmsEnabled: true, role: true },
      })
    : sellerKind
      ? null
      : order.user;
  if (sellerKind && owner?.role !== "SUPPLIER")
    return { blocked: "SELLER_ACCESS_REVOKED" };
  if (owner?.orderSmsEnabled === false)
    return { blocked: "ACCOUNT_OPT_OUT" } as const;
  const phone = sellerKind
    ? supplier!.phone
    : row.kind === "BUYER_PAYMENT"
      ? order.user.phone || order.user.paymentPhone
      : deliveryContact(order.shippingAddress).phone;
  const recipient = deliverySmsRecipient(phone);
  if (!recipient) return { blocked: "RECIPIENT_UNAVAILABLE" } as const;
  let message: string;
  if (row.kind === "BUYER_PAYMENT") {
    const names = order.orderitems.map((i) => `${i.qty}x ${i.name}`).join(", ");
    message = `Mambo ${order.user.name}, malipo ya agizo lako #${order.id.slice(0, 8)} yamekamilika! Bidhaa: ${names}. Jumla kuu: TZS ${new Intl.NumberFormat("en-US").format(Number(order.totalPrice))}. Asante kwa kuchagua Nimboya!`;
  } else if (row.kind === "SELLER_PAYMENT") {
    const actionable = order.orderitems.filter(
      (i) =>
        i.supplierId === row.targetId &&
        i.payoutStatus === "ESCROW" &&
        ["PAID", "PREPARING"].includes(i.status),
    );
    if (!actionable.length) return { blocked: "EVENT_NO_LONGER_APPLIES" };
    const names = actionable.map((i) => `${i.qty}x ${i.name}`).join(", ");
    message = `Habari ${supplier!.companyName || supplier!.name}, umepokea agizo jipya la jumla! Agizo ID: #${order.id.slice(0, 8)}. Bidhaa za kuandaa: ${names}. Fedha zimewekwa salama kwenye Escrow yako. Tafadhali ingia Nimboya Dashboard kuanza kuandaa mzigo.`;
  } else if (row.kind === "SELLER_DELIVERY") {
    if (
      !item?.isDelivered ||
      item.payoutStatus !== "PAID" ||
      item.supplierId !== row.targetId
    )
      return { blocked: "EVENT_NO_LONGER_APPLIES" } as const;
    message = `Habari ${supplier!.name}, mteja (${order.user.name}) amethibitisha kupokea ${item.qty}x ${item.name}. Agizo #${order.id.slice(0, 8)}. Malipo yametolewa kwenye wallet yako.`;
  } else {
    if (!item || item.isDelivered || item.status !== "DISPATCHED")
      return { blocked: "EVENT_NO_LONGER_APPLIES" } as const;
    const dispute = await prisma.returnRequest.findUnique({
      where: {
        orderId_productId: { orderId: order.id, productId: item.productId },
      },
    });
    if (dispute && dispute.status !== "REJECTED")
      return { blocked: "EVENT_NO_LONGER_APPLIES" } as const;
    message =
      row.kind === "BUYER_DISPATCH"
        ? `Nimboya: Mzigo wako "${item.name}" umetumwa.\n${item.dispatchNote || ""}\nAgizo #${order.id.slice(0, 8)}. Ukipokea, thibitisha kwenye akaunti yako.`
        : `Nimboya: Tafadhali thibitisha kama umepokea "${item.name}" kwa agizo #${order.id.slice(0, 8)}. Hii itasaidia supplier kulipwa kwa wakati.`;
  }
  return { recipient, message };
}

async function finish(
  row: OrderNotification,
  token: string,
  result: ReturnType<typeof smsAcceptance>,
) {
  return prisma.$transaction(async (tx) => {
    const state =
      result.state === "RETRY" && row.attempts >= MAX_NOTIFICATION_ATTEMPTS
        ? "FAILED"
        : result.state;
    const claim = await tx.orderNotification.updateMany({
      where: { id: row.id, state: "SENDING", leaseToken: token },
      data: {
        state,
        reason: result.reason,
        providerMessageId: result.messageId ?? null,
        acceptedAt: state === "ACCEPTED" ? new Date() : null,
        completedAt: ["ACCEPTED", "FAILED", "SUPPRESSED"].includes(state)
          ? new Date()
          : null,
        nextAttemptAt: new Date(
          Date.now() + Math.min(3600000, 60000 * 2 ** (row.attempts - 1)),
        ),
        leaseToken: null,
        leaseUntil: null,
      },
    });
    if (claim.count && result.reason === "PROVIDER_OPT_OUT") {
      const supplier = row.kind.startsWith("SELLER_")
        ? await tx.supplier.findUnique({
            where: { id: row.targetId },
            select: { userId: true },
          })
        : null;
      const userId = row.kind.startsWith("SELLER_")
        ? supplier?.userId
        : row.targetId;
      if (userId)
        await tx.user.updateMany({
          where: { id: userId },
          data: { orderSmsEnabled: false },
        });
    }
    if (claim.count)
      await tx.orderNotificationEvent.create({
        data: { notificationId: row.id, state, reason: result.reason },
      });
    return !!claim.count;
  });
}

// No implicit scheduler or inline delivery: only an explicitly enabled trusted runner calls dryRun:false.
export async function notificationBatch({
  dryRun = true,
  limit = 20,
}: { dryRun?: boolean; limit?: number } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
    throw new Error("Invalid batch size");
  const now = new Date();
  const candidates = await prisma.orderNotification.findMany({
    where: {
      OR: [
        {
          state: { in: ["QUEUED", "RETRY"] },
          nextAttemptAt: { lte: now },
          attempts: { lt: MAX_NOTIFICATION_ATTEMPTS },
        },
        { state: "SENDING", leaseUntil: { lte: now } },
      ],
    },
    orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
    take: limit,
  });
  const results = [];
  for (const candidate of candidates) {
    if (dryRun) {
      results.push({ id: candidate.id, state: candidate.state });
      continue;
    }
    const token = randomUUID();
    const row = await prisma.$transaction(async (tx) => {
      if (candidate.state === "SENDING") {
        const expired = await tx.orderNotification.updateMany({
          where: {
            id: candidate.id,
            state: "SENDING",
            leaseUntil: { lte: new Date() },
          },
          data: {
            state: "UNKNOWN",
            reason: "LEASE_EXPIRED_REVIEW",
            leaseToken: null,
            leaseUntil: null,
          },
        });
        if (expired.count)
          await tx.orderNotificationEvent.create({
            data: {
              notificationId: candidate.id,
              state: "UNKNOWN",
              reason: "LEASE_EXPIRED_REVIEW",
            },
          });
        return null;
      }
      const claim = await tx.orderNotification.updateMany({
        where: {
          id: candidate.id,
          state: { in: ["QUEUED", "RETRY"] },
          nextAttemptAt: { lte: new Date() },
          attempts: { lt: MAX_NOTIFICATION_ATTEMPTS },
        },
        data: {
          state: "SENDING",
          attempts: { increment: 1 },
          leaseToken: token,
          leaseUntil: new Date(Date.now() + 90000),
        },
      });
      if (!claim.count) return null;
      await tx.orderNotificationEvent.create({
        data: {
          notificationId: candidate.id,
          state: "SENDING",
          reason: "WORKER_CLAIMED",
        },
      });
      return tx.orderNotification.findUniqueOrThrow({
        where: { id: candidate.id },
      });
    });
    if (!row) continue;
    try {
      const rendered = await render(row);
      if ("blocked" in rendered) {
        await finish(row, token, {
          state:
            rendered.blocked === "RECIPIENT_UNAVAILABLE"
              ? "FAILED"
              : "SUPPRESSED",
          reason: rendered.blocked,
        });
      } else {
        // Recheck the fence immediately before external IO. A crash after send remains inherently ambiguous.
        const active = await prisma.orderNotification.count({
          where: {
            id: row.id,
            state: "SENDING",
            leaseToken: token,
            leaseUntil: { gt: new Date() },
          },
        });
        if (!active) continue;
        const response = await sendSms(rendered.recipient, rendered.message);
        await finish(
          row,
          token,
          smsAcceptance(await response.json(), rendered.recipient),
        );
      }
    } catch {
      await finish(row, token, {
        state: "UNKNOWN",
        reason: "SEND_OUTCOME_UNKNOWN",
      });
    }
    results.push({
      id: row.id,
      state: (
        await prisma.orderNotification.findUniqueOrThrow({
          where: { id: row.id },
        })
      ).state,
    });
  }
  return results;
}

// Only terminal event history may expire. Unique outbox tombstones and unresolved evidence remain.
export async function notificationRetention({
  dryRun = true,
  olderThan,
  limit = 100,
}: {
  dryRun?: boolean;
  olderThan: Date;
  limit?: number;
}) {
  if (
    !Number.isFinite(olderThan.getTime()) ||
    olderThan.getTime() > Date.now() - 90 * 86400000 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 1000
  )
    throw new Error("Invalid retention boundary");
  const rows = await prisma.orderNotificationEvent.findMany({
    where: {
      createdAt: { lt: olderThan },
      notification: {
        state: { in: ["ACCEPTED", "SUPPRESSED"] },
        completedAt: { lt: olderThan },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  if (!dryRun)
    await prisma.orderNotificationEvent.deleteMany({
      where: {
        id: { in: rows.map((r) => r.id) },
        notification: {
          state: { in: ["ACCEPTED", "SUPPRESSED"] },
          completedAt: { lt: olderThan },
        },
      },
    });
  return { eligible: rows.length, dryRun };
}
