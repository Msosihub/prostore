import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { sendSms } from "@/lib/africasTalking";
import { APP_NAME, SUPPLIER_URL } from "@/lib/constants";
import { NextResponse } from "next/server";

//api for sending notification email/sms to supplier (for admin use only)

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = req.json();
  const isVerified = (await data).isVerified;

  try {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });
    if (!supplier)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Here you would integrate with your email/SMS service to send the notification
    // For example:
    // await sendEmail(supplier.email, "Notification Subject", "Notification Body");

    //notification sms content to tell a supplier is verified or rejected
    //message  content to tell a supplier is verified or rejected in swahili
    const message = isVerified
      ? `Akaunti yako ya msambazaji ${supplier.name} imethibitishwa. Sasa unaweza kufikia vipengele vyote. Karibu ${APP_NAME}!\n\n ${SUPPLIER_URL}/${supplier.id} `
      : `Akaunti yako ya msambazaji ${supplier.name} imeshindikana kudhibitisha. Tafadhali wasiliana na 0760 111 880 kwa maelezo zaidi. Asante kwa kutumia ${APP_NAME}.`;

    if (supplier.phone) {
      const smsResponse = await sendSms(supplier.phone, message);
      console.log("SMS sent successfully:", smsResponse);
    }

    return NextResponse.json(supplier);
  } catch (err) {
    console.error("GET sending notification email/sms error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
