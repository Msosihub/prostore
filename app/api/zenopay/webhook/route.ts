import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { paymentAttempt, reconcileZenopay } from "@/lib/zenopay-reconciliation";

import {
  authenticPaymentNotice,
  retainUnmatchedNotice,
} from "@/lib/unmatched-payment-notice";

export const dynamic = "force-dynamic";

async function boundedJson(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(req: Request) {
  const input = z
    .object({
      order_id: z.string().regex(/^[A-Za-z0-9=_-]{1,150}$/),
      payment_status: z.unknown().optional(),
    })
    .safeParse(await boundedJson(req));
  if (!input.success)
    return NextResponse.json(
      { error: "Invalid notification" },
      { status: 400 },
    );
  const attempt = input.data.order_id;
  const orderId = attempt.split("=")[0];
  try {
    const order = z.string().uuid().safeParse(orderId).success
      ? await prisma.order.findUnique({ where: { id: orderId } })
      : null;
    if (
      !order ||
      order.paymentMethod !== "ZENOPAY" ||
      paymentAttempt(order.paymentResult) !== attempt
    ) {
      if (authenticPaymentNotice(req)) {
        await retainUnmatchedNotice(attempt, input.data.payment_status);
        return NextResponse.json(
          {
            error: "Payment reference requires ownership review; not processed",
          },
          { status: 503, headers: { "Retry-After": "300" } },
        );
      }
      return NextResponse.json(
        { error: "Unknown payment attempt" },
        { status: 404 },
      );
    }
    await reconcileZenopay(orderId, attempt, true);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Payment verification unavailable; retry notification" },
      { status: 503 },
    );
  }
}
