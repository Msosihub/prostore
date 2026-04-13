import { NextResponse } from "next/server";
import { zenopayRequest } from "@/lib/zenopay";
import { prisma } from "@/db/prisma";
import { formatTanzaniaPhonetToStarZero } from "@/lib/utils";

export async function POST(req: Request) {
  const { orderId } = await req.json();

  console.log("ORDER ID CREAYTED: ", orderId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderitems: true, user: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // // 🚨 Prevent duplicate mobile money requests
  // if (order.paymentStatus === "PENDING") {
  //   return NextResponse.json({
  //     success: true,
  //     message: "Payment already pending. Check your phone.",
  //   });
  // }

  const shipping = order.shippingAddress as {
    city: string;
    phone: string;
    fullName: string;
  };
  // const phoneNumber = formatTanzaniaPhonetToStarZero(
  //   shipping.phone || order.user.phone || ""
  // );

  const paymentPhone = formatTanzaniaPhonetToStarZero(
    order.user.paymentPhone || ""
  );

  console.log("paymeent number: ", paymentPhone);
  const payload = {
    order_id: order.id,
    buyer_email: order.user.email || "bmproductstz@gmail.com",
    buyer_name: shipping?.fullName,
    buyer_phone: paymentPhone || "",
    amount: Number(order.totalPrice),
    webhook_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/api/zenopay/webhook`,
  };

  console.log("Zenopay Payload:", payload);

  const response = await zenopayRequest(
    "/api/payments/mobile_money_tanzania",
    payload
  );

  // Zenopay returns JSON like:
  // { status: "success", resultcode: "000", message: "...", order_id: "..." }

  if (response.status !== "success") {
    console.error("Zenopay error response:", response);
    return NextResponse.json({ error: response.message }, { status: 400 });
  }

  // Save pending state
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentMethod: "ZENOPAY",
      paymentStatus: "PENDING",
      paymentResult: {
        reference: response.reference,
        raw: response,
      },
    },
  });

  return NextResponse.json({
    success: true,
    message: "Payment request sent. Please approve on your phone.",
  });
}
