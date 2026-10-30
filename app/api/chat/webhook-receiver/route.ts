import { NextResponse } from "next/server";
// Retired legacy relay: never acknowledge messages as processed.
export async function POST() {
  return NextResponse.json(
    { error: "Legacy chat relay retired", code: "LEGACY_CHAT_RETIRED" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
