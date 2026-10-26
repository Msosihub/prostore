import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { boundAttempt, recoverPayment } from "@/lib/payment-recovery";
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = z
    .object({ orderId: z.string().uuid(), admin: z.boolean().optional() })
    .safeParse(await req.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user || (input.data.admin && user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const order = await prisma.order.findFirst({
    where: {
      id: input.data.orderId,
      ...(input.data.admin ? {} : { userId: session.user.id }),
    },
  });
  if (!order)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const attempt = boundAttempt(order.paymentResult);
  if (order.paymentMethod !== "ZENOPAY" || !attempt)
    return NextResponse.json(
      {
        error:
          "No supported payment reference. Contact support; do not send another payment.",
      },
      { status: 409 },
    );
  try {
    const status = await recoverPayment(order.id, attempt);
    return NextResponse.json({
      status,
      message:
        status === "COMPLETED"
          ? "Payment confirmed and order recorded."
          : status === "REQUIRES_REVIEW"
            ? "Payment requires support review. Do not pay again."
            : "Payment is not confirmed. Wait at least 30 seconds before checking again; no new charge was sent.",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Status unavailable. Your payment reference is preserved. Do not pay again; contact support if this continues.",
      },
      { status: 503 },
    );
  }
}
