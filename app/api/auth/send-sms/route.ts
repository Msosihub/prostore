import { NextResponse } from "next/server";

// No supported UI uses this generic relay. OTP and authorized workflow
// notifications call the server-only helper with server-constructed messages.
export async function POST() {
  return NextResponse.json({ error: "Endpoint retired" }, { status: 410 });
}
