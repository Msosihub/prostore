// /api/auth/reset-password/route.ts
import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";
import { hashSync } from "bcrypt-ts-edge";

export async function POST(req: Request) {
  const { identifier, otp, newPassword } = await req.json();

  // Verify OTP exists
  const record = await prisma.verificationToken.findFirst({
    where: { identifier, token: otp },
  });

  if (!record)
    return NextResponse.json({ success: false, message: "Invalid OTP" });
  if (record.expires < new Date())
    return NextResponse.json({ success: false, message: "OTP expired" });

  // Update password
  await prisma.user.updateMany({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
    data: { password: hashSync(newPassword) },
  });

  // Delete OTP
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier, token: otp } },
  });

  return NextResponse.json({ success: true, message: "Password updated" });
}
