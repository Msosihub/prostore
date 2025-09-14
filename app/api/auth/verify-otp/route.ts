// api/auth/verify-otp/route.ts
import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { identifier, token } = await req.json();
  console.log("Verifying OTP for:", identifier, token);

  const record = await prisma.verificationToken.findFirst({
    where: { identifier, token },
  });
  console.log("OTP Record Found:", record);

  if (record === null) {
    return NextResponse.json({ success: false, message: "OTP si sahihi" });
    console.log("NO RECORD");
  }
  if (record.expires < new Date())
    return NextResponse.json({
      success: false,
      message: "OTP imeisha muda wake",
    });

  //soround with try catch finally
  try {
    // OTP valid → just delete the token (so it's one-time)
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier, token } },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting OTP record:", error);
    return NextResponse.json({ success: true });
  } finally {
    console.log("OTP record deletion attempted.");
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}

// import { prisma } from "@/db/prisma";
// import { NextResponse } from "next/server";
// import { hashSync } from "bcrypt-ts-edge";

// export async function POST(req: Request) {
//   const { identifier, token, password } = await req.json();

//   const record = await prisma.verificationToken.findFirst({
//     where: { identifier, token },
//   });

//   if (!record)
//     return NextResponse.json({ success: false, message: "Invalid code" });
//   if (record.expires < new Date())
//     return NextResponse.json({ success: false, message: "Code expired" });

//   // Mark user as verified
//   const user = await prisma.user.findFirst({
//     where: { OR: [{ email: identifier }, { phone: identifier }] },
//   });

//   if (!user)
//     return NextResponse.json({ success: false, message: "User not found" });

//   await prisma.user.update({
//     where: { id: user.id },
//     data: {
//       isVerified: true,
//       password: password ? hashSync(password) : user.password,
//     },
//   });

//   // Delete token
//   await prisma.verificationToken.delete({
//     where: { identifier_token: { identifier, token } },
//   });

//   return NextResponse.json({ success: true });
// }
