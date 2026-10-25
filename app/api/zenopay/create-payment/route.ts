import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { zenopayRequest } from "@/lib/zenopay";
import { paymentAttempt, reconcileZenopay } from "@/lib/zenopay-reconciliation";
import { prisma } from "@/db/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = z
    .object({ orderId: z.string().uuid() })
    .safeParse(await req.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  try {
    const order = await prisma.order.findUnique({
      where: { id: input.data.orderId },
      include: { user: true },
    });
    if (!order || order.userId !== session.user.id)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.isPaid)
      return NextResponse.json({ success: true, status: "COMPLETED" });

    const existingAttempt = paymentAttempt(order.paymentResult);
    if (existingAttempt) {
      const status = await reconcileZenopay(order.id, existingAttempt);
      return NextResponse.json({
        success: status !== "FAILED",
        status,
        message:
          status === "FAILED"
            ? "Payment failed. Contact support before starting another payment."
            : "Payment status checked. No additional payment request sent.",
      });
    }
    // Legacy/other-provider results need reconciliation, not an automatic new charge.
    if (order.paymentResult !== null)
      return NextResponse.json(
        { error: "Existing payment requires review" },
        { status: 409 },
      );
    const phone = (order.user.paymentPhone || "")
      .trim()
      .replace(/^\+?255/, "0");
    // Phone-only OTP accounts are valid buyers. Use a non-deliverable,
    // per-buyer address instead of sending receipts to an unrelated fallback.
    const buyerEmail = order.user.email || `${order.userId}@payments.invalid`;
    const shipping = z
      .object({ fullName: z.string().trim().min(1) })
      .safeParse(order.shippingAddress);
    if (
      !/^0[67]\d{8}$/.test(phone) ||
      !shipping.success ||
      !z.string().email().safeParse(buyerEmail).success ||
      Number(order.totalPrice) <= 0
    ) {
      return NextResponse.json(
        { error: "Check your payment phone, email and shipping name" },
        { status: 400 },
      );
    }
    const baseUrl = z.string().url().parse(process.env.NEXT_PUBLIC_SERVER_URL);
    if (!process.env.ZENOPAY_API_KEY)
      throw new Error("Missing payment configuration");
    const attempt = `${order.id}=${randomUUID()}`;
    // Persist before the network call; concurrent clicks can only claim once.
    // A timeout is ambiguous and must retain the attempt for reconciliation.
    const claim = await prisma.order.updateMany({
      where: {
        id: order.id,
        userId: session.user.id,
        isPaid: false,
        paymentResult: { equals: Prisma.AnyNull },
      },
      data: {
        paymentMethod: "ZENOPAY",
        paymentStatus: "PENDING",
        paymentResult: { zenopay_order_id: attempt },
      },
    });
    if (!claim.count)
      return NextResponse.json(
        { error: "Payment already in progress. Check the order status." },
        { status: 409 },
      );
    await zenopayRequest("/api/payments/mobile_money_tanzania", {
      order_id: attempt,
      buyer_email: buyerEmail,
      buyer_name: shipping.data.fullName,
      buyer_phone: phone,
      amount: Number(order.totalPrice),
      webhook_url: new URL("/api/zenopay/webhook", baseUrl).toString(),
    });
    return NextResponse.json({
      success: true,
      status: "PENDING",
      message:
        "Please approve the request on your phone. Payment is not yet confirmed.",
    });
  } catch {
    // Do not leak provider responses, payer details, credentials or database errors.
    return NextResponse.json(
      {
        error:
          "Unable to confirm payment. Check your order before trying again.",
      },
      { status: 502 },
    );
  }
}
