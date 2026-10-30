import { NextResponse } from "next/server";
import { requestOtp, OtpError } from "@/lib/otp";
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    await requestOtp(body?.identifier);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof OtpError)
      return NextResponse.json(
        { success: false, message: error.message },
        {
          status: error.status,
          headers: error.retryAfter
            ? { "Retry-After": String(error.retryAfter) }
            : undefined,
        },
      );
    console.error("OTP delivery failed");
    return NextResponse.json(
      { success: false, message: "Hitilafu imetokea kwenye seva." },
      { status: 500 },
    );
  }
}
