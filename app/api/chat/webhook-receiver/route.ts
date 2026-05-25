//  to receive updates from your NestJS backend (ubuntuServer chat.bmsounds.online))
//  and stream them directly to the buyer's UI via Server-Sent Events (SSE).

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-nimboya-internal-key");
  if (token !== process.env.INTERNAL_SHARED_SECRET) {
    return new NextResponse("Forbidden Context Key", { status: 403 });
  }

  const { receiverId, message } = await req.json();

  // Broadcast the message globally to active frontend SSE streams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof global !== "undefined" && (global as any).chatEventEmitter) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).chatEventEmitter.emit("message", {
      receiverId,
      message,
    });
  }

  return NextResponse.json({ processed: true });
}
