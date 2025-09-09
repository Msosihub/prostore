import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId, body, attachments } = await req.json();
  if (!conversationId || (!body && !attachments)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: session.user.id,
      content: body,
      attachments: attachments
        ? JSON.parse(JSON.stringify(attachments))
        : undefined,
    },
  });

  // Realtime fanout
  try {
    await pusherServer.trigger(
      `conversation-${conversationId}`,
      "new-message",
      message
    );
  } catch (e) {
    // Non-fatal: allow message even if realtime failed
    console.error("Pusher trigger failed", e);
  }

  return NextResponse.json(message);
}
