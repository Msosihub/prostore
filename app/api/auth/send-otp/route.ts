// /api/auth/send-otp/route.ts

import { prisma } from "@/db/prisma";
import { sendSms } from "@/lib/africasTalking";
import { normalizeIdentifier } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let { identifier } = await req.json();

  if (!identifier || typeof identifier !== "string") {
    return NextResponse.json(
      { success: false, message: "Identifier required" },
      { status: 400 }
    );
  }

  identifier = normalizeIdentifier(identifier);

  const token = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  const existing = await prisma.verificationToken.findFirst({
    where: { identifier },
  });

  if (existing) {
    // 3 attempts max
    if (existing.attempts >= 3) {
      const cooldownEnd = new Date(
        existing.createdAt.getTime() + 15 * 60 * 1000
      );

      if (cooldownEnd > new Date()) {
        return NextResponse.json(
          {
            success: false,
            message: "Umezidisha maombi. Jaribu tena baada ya dakika 15.",
          },
          { status: 429 }
        );
      }
    }

    // remove old token
    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });
  }

  await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires,
      attempts: existing ? existing.attempts + 1 : 1,
    },
  });

  // Send OTP
  if (identifier.includes("@")) {
    // TODO: sendEmail
  } else {
    await sendSms(identifier, `Namba yako ya kuhakiki ni ${token}`);
  }

  return NextResponse.json({ success: true });
}

// async function sendSms(phone: string, message: string) {
//   console.log(`${phone} => ${message}`);
//   // integrate real SMS provider here
//   // const res = await sendSms(phone, message + " - karibu ProStore 🚀");
//   // console.log("SMS provider response:", res);
// }

// async function sendEmail() {
// // email: string, message: string
//   // console.log(`${email} => ${message}`);
//   // integrate real email provider here
// }
