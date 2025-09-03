// /api/auth/send-otp/route.ts
import { prisma } from "@/db/prisma";
import { sendSms } from "@/lib/africasTalking";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { identifier } = await req.json(); // email or phone
  if (!identifier)
    return NextResponse.json({
      success: false,
      message: "Identifier required",
    });

  const token = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const existing = await prisma.verificationToken.findFirst({
    where: { identifier },
  });

  if (existing && existing.attempts >= 3) {
    const cooldown = new Date(existing.createdAt.getTime() + 15 * 60 * 1000);
    if (cooldown > new Date()) {
      return NextResponse.json({
        success: false,
        message: "Too many requests. Try again later.",
      });
    }
  }

  await prisma.verificationToken.upsert({
    where: { identifier_token: { identifier, token: existing?.token ?? "" } },
    update: {
      token,
      expires,
      attempts: existing ? { increment: 1 } : 1,
      createdAt: new Date(),
    },
    create: {
      identifier,
      token,
      expires,
      attempts: 1,
    },
  });

  // send OTP
  if (identifier.includes("@")) {
    await sendEmail(identifier, `Your verification code is ${token}`);
  } else {
    sendSms(identifier, `Namba yako ya kuhakiki ni ${token}`);
  }

  return NextResponse.json({ success: true, message: "OTP sent successfully" });
}

// async function sendSms(phone: string, message: string) {
//   console.log(`${phone} => ${message}`);
//   // integrate real SMS provider here
//   // const res = await sendSms(phone, message + " - karibu ProStore 🚀");
//   // console.log("SMS provider response:", res);
// }

async function sendEmail(email: string, message: string) {
  console.log(`${email} => ${message}`);
  // integrate real email provider here
}
