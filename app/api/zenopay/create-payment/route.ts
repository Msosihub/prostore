import { NextResponse } from "next/server";
import { zenopayRequest } from "@/lib/zenopay";
import { prisma } from "@/db/prisma";
import { formatTanzaniaPhonetToStarZero } from "@/lib/utils";

export async function POST(req: Request) {
  const { orderId } = await req.json();

  console.log("ORDER ID SUBMITTED FOR PAYMENT: ", orderId);
  console.time("Prisma Fetch Order");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      totalPrice: true,
      shippingAddress: true,
      user: {
        select: {
          email: true,
          paymentPhone: true,
        },
      },
    },
  });

  console.timeEnd("Prisma Fetch Order");

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const shipping = order.shippingAddress as {
    city: string;
    phone: string;
    fullName: string;
  };

  const paymentPhone = formatTanzaniaPhonetToStarZero(
    order.user.paymentPhone || "",
  );

  console.log("payment number: ", paymentPhone);
  console.log("Webhook url: ", process.env.NEXT_PUBLIC_SERVER_URL);

  // 🟢 SOLUTION: Append a dynamic timestamp suffix to bypass Selcom unique constraint blocks
  const uniqueZenopayOrderId = `${order.id}=${Date.now()}`;

  const payload = {
    order_id: uniqueZenopayOrderId, // Sent dynamically to Zenopay
    buyer_email: order.user.email || "bmproductstz@gmail.com",
    buyer_name: shipping?.fullName,
    buyer_phone: paymentPhone || "",
    amount: Number(order.totalPrice),
    webhook_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/api/zenopay/webhook`,
  };

  console.log("Zenopay Payload:", payload);

  console.time("Zenopay API Call");
  const response = await zenopayRequest(
    "/api/payments/mobile_money_tanzania",
    payload,
  );

  console.timeEnd("Zenopay API Call");
  if (response.status !== "success") {
    console.error("Zenopay error response:", response);
    return NextResponse.json({ error: response.message }, { status: 400 });
  }

  // Save pending state under the core clean order ID
  console.time("Prisma Update Order");
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentMethod: "ZENOPAY",
      paymentStatus: "PENDING",
      paymentResult: {
        zenopay_order_id: uniqueZenopayOrderId, // Track the exact suffix reference used for safety
        reference: response.reference,
        raw: response,
      },
    },
  });
  console.timeEnd("Prisma Update Order");

  return NextResponse.json({
    success: true,
    message: "Payment request sent. Please approve on your phone.",
  });
}
