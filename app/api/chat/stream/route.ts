// To allow messages arriving at your webhook - receiver to instantly stream into the user's browser without requiring a page refresh,
// we need an active listener endpoint.Let's create this file now.

import { NextRequest } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Hujaruhusiwa (Unauthorized)", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send handshake token string to keep connection alive
      controller.enqueue(encoder.encode("retry: 10000\n\n"));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleBroadcast = (eventData: any) => {
        // Only stream the message if it's meant for the logged-in user
        if (eventData.receiverId === userId) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(eventData.message)}\n\n`),
          );
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof global !== "undefined" && (global as any).chatEventEmitter) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (global as any).chatEventEmitter.on("message", handleBroadcast);
      }

      req.signal.addEventListener("abort", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (
          typeof global !== "undefined" &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (global as any).chatEventEmitter
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (global as any).chatEventEmitter.off("message", handleBroadcast);
        }
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// Now, update your existing app/api/chat/webhook-receiver/route.ts to trigger this broadcast pipeline:
