import { NextResponse } from "next/server";
import { consumeOtp } from "@/lib/otp";
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const user = await consumeOtp(body?.identifier, body?.token);
    if (!user)
      return NextResponse.json(
        {
          success: false,
          message:
            "Msimbo si sahihi, umeisha muda au majaribio yamezidi. Omba mwingine baada ya muda.",
        },
        { status: 400 },
      );
    return NextResponse.json({
      success: true,
      message: "Uthibitisho umekamilika.",
      user: { id: user.id, email: user.email, phone: user.phone },
    });
  } catch {
    console.error("OTP verification failed");
    return NextResponse.json(
      { success: false, message: "Hitilafu imetokea kwenye seva." },
      { status: 500 },
    );
  }
}
