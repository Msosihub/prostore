//send message

import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { sendMessageSchema } from "@/lib/validators/chat";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversationId = params.conversationId;
    const json = await req.json();
    const parsed = sendMessageSchema.parse({ ...json, conversationId });

    // Confirm membership
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { buyerId: true, supplierId: true },
    });
    if (!conv)
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );

    const isMember =
      session.user.id === conv.buyerId || session.user.id === conv.supplierId;
    if (!isMember)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: session.user.id,
        body: parsed.body,
        attachments: parsed.attachments ?? null,
      },
    });

    // push to conversation channel
    await pusherServer.trigger(
      `private-conv-${conversationId}`,
      "message:new",
      {
        message,
        conversationId,
      }
    );

    return NextResponse.json({ message });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error" }, { status: 400 });
  }
}
