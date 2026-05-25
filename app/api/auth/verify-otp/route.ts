import { prisma } from "@/db/prisma";
import { normalizeIdentifier } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { identifier, token } = await req.json();

    if (!identifier || !token) {
      return NextResponse.json(
        { success: false, message: "Taarifa hazijakamilika." },
        { status: 400 },
      );
    }

    const cleanIdentifier = normalizeIdentifier(identifier.trim());
    const cleanToken = token.trim();

    console.log("Verifying OTP for:", cleanIdentifier, cleanToken);
    // 1. Fetch token record
    const record = await prisma.verificationToken.findFirst({
      where: { identifier: cleanIdentifier, token: cleanToken },
    });

    console.log("OTP Record Found:", record);

    if (!record) {
      return NextResponse.json(
        { success: false, message: "OTP uliyoweka si sahihi." },
        { status: 400 },
      );
    }

    // 2. Validate expiration timestamp thresholds
    if (record.expires < new Date()) {
      await prisma.verificationToken
        .delete({
          where: {
            identifier_token: {
              identifier: cleanIdentifier,
              token: cleanToken,
            },
          },
        })
        .catch(() => {}); // Gracefully catch if already dropped

      return NextResponse.json(
        { success: false, message: "OTP imeisha muda wake." },
        { status: 400 },
      );
    }

    // 3. Atomically consume token so it can't be reused
    await prisma.verificationToken.delete({
      where: {
        identifier_token: { identifier: cleanIdentifier, token: cleanToken },
      },
    });

    // 4. Locate or instantiate the user account (Auto-Registration Sequence)
    const isEmail = cleanIdentifier.includes("@");
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: cleanIdentifier }, { email: cleanIdentifier }],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: isEmail ? cleanIdentifier : null,
          phone: isEmail ? null : cleanIdentifier,
          name: `Mteja_${Math.floor(1000 + Math.random() * 9000)}`, // Fallback display name
          isVerified: true,
        },
      });
    } else if (!user.isVerified) {
      // Mark as active if previously unverified
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Uthibitisho umekamilika.",
      user: { id: user.id, email: user.email, phone: user.phone },
    });
  } catch (error) {
    console.error("CRITICAL_VERIFY_OTP_ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Hitilafu imetokea kwenye seva." },
      { status: 500 },
    );
  }
}
