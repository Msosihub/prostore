// send message
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { sendMessageSchema } from "@/lib/validators/chat";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher/server";

interface ParsedAttachment {
  url: string;
  name?: string;
  size?: number;
  type?: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { conversationId } = await params;
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
    if (!session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isMember)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // ✅ Fix attachments: wrap in { create: [...] }
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: session.user.id,
        content: parsed.body,
        attachments: parsed.attachments?.length
          ? {
              create: parsed.attachments.map((att: ParsedAttachment) => ({
                url: att.url,
                name: att.name,
              })),
            }
          : undefined, // don't use null
      },
      include: {
        attachments: true, // return them in response
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
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e ?? "Error" }, { status: 400 });
  }
}
