import { assertDryRun } from "@/lib/worker-options";
import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/db/prisma";
import { sendSms } from "@/lib/africasTalking";
import { deliverySmsRecipient } from "@/lib/fulfillment-view";
import {
  smsAcceptance,
  MAX_NOTIFICATION_ATTEMPTS,
} from "@/lib/order-notification-outbox";
import { phoneDigest } from "@/lib/seller-registration";
import type { SellerNotice } from "@prisma/client";
async function render(
  row: SellerNotice,
): Promise<{ blocked: string } | { recipient: string; message: string }> {
  const registration = await prisma.sellerRegistration.findUnique({
    where: { id: row.registrationId },
    include: {
      supplier: {
        select: {
          isVerified: true,
          user: { select: { role: true, phone: true, phoneVerified: true } },
        },
      },
    },
  });
  if (!registration?.smsConsent) return { blocked: "NO_SMS_CONSENT" };
  const user = registration.supplier.user;
  const recipient = deliverySmsRecipient(user.phone);
  if (
    user.role !== "SUPPLIER" ||
    !user.phoneVerified ||
    !recipient ||
    phoneDigest(recipient) !== registration.phoneDigest
  )
    return { blocked: "RECIPIENT_UNAVAILABLE" };
  if (row.kind === "RECEIVED" && registration.state !== "PENDING")
    return { blocked: "EVENT_NO_LONGER_APPLIES" };
  if (
    row.kind !== "RECEIVED" &&
    (row.version !== registration.version ||
      row.kind !== registration.state ||
      (row.kind === "APPROVED" && !registration.supplier.isVerified))
  )
    return { blocked: "EVENT_NO_LONGER_APPLIES" };
  const messages: Record<string, string> = {
    RECEIVED:
      "Nimboya: Tumepokea ombi lako la kuwa muuzaji. Linasubiri ukaguzi; bado halijaidhinishwa. Angalia hali kwenye akaunti yako /sell.",
    APPROVED:
      "Nimboya: Ombi lako la kuwa muuzaji limeidhinishwa. Ingia kwenye akaunti yako kuona duka na kusimamia bidhaa.",
    REJECTED:
      "Nimboya: Ukaguzi wa ombi lako la muuzaji umekamilika. Halijaidhinishwa. Ingia kwenye akaunti yako kuona maelezo.",
  };
  if (!messages[row.kind]) return { blocked: "EVENT_NO_LONGER_APPLIES" };
  return { recipient, message: messages[row.kind] };
}
async function finish(
  row: SellerNotice,
  token: string,
  result: ReturnType<typeof smsAcceptance>,
) {
  return prisma.$transaction(async (tx) => {
    const state =
      result.state === "RETRY" && row.attempts >= MAX_NOTIFICATION_ATTEMPTS
        ? "FAILED"
        : result.state;
    const claim = await tx.sellerNotice.updateMany({
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
      await tx.sellerRegistration.update({
        where: { id: row.registrationId },
        data: { smsConsent: false },
      });
    }
    if (claim.count)
      await tx.sellerNoticeEvent.create({
        data: { notificationId: row.id, state, reason: result.reason },
      });
    return !!claim.count;
  });
}

// No implicit scheduler or inline delivery: only an explicitly enabled trusted runner calls dryRun:false.
export async function sellerNoticeBatch({
  dryRun = true,
  limit = 20,
}: { dryRun?: boolean; limit?: number } = {}) {
  assertDryRun(dryRun);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
    throw new Error("Invalid batch size");
  const now = new Date();
  const candidates = await prisma.sellerNotice.findMany({
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
        const expired = await tx.sellerNotice.updateMany({
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
          await tx.sellerNoticeEvent.create({
            data: {
              notificationId: candidate.id,
              state: "UNKNOWN",
              reason: "LEASE_EXPIRED_REVIEW",
            },
          });
        return null;
      }
      const claim = await tx.sellerNotice.updateMany({
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
      await tx.sellerNoticeEvent.create({
        data: {
          notificationId: candidate.id,
          state: "SENDING",
          reason: "WORKER_CLAIMED",
        },
      });
      return tx.sellerNotice.findUniqueOrThrow({
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
        const active = await prisma.sellerNotice.count({
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
        await prisma.sellerNotice.findUniqueOrThrow({
          where: { id: row.id },
        })
      ).state,
    });
  }
  return results;
}
