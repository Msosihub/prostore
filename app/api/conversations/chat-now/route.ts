// /api/conversations/chat-now/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(req: Request) {
  try {
    const { buyerId, supplierId, productId, supplierUserId } = await req.json();

    // 1. Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        buyerId_supplierId: {
          buyerId,
          supplierId: supplierUserId,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { buyerId, supplierId: supplierUserId },
      });

      await pusherServer.trigger(`private-user-${supplierId}`, "conv:new", {
        conversation,
      });
    }

    // 2. If productId exists → create a product "marker" message
    if (productId) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: buyerId,
          content: "", // no text, just product
          productId,
        },
      });
    }

    // 3. Fetch conversation with full details & messages
    const fullConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        buyer: true,
        supplier: true,
        inquiry: true,
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                price: true,
              },
            },
            attachments: true,
            sender: {
              select: { id: true, name: true, role: true },
            },
            replyTo: {
              select: { id: true, content: true, senderId: true },
            },
          },
        },
      },
    });

    // Push this product marker to both peers
    await pusherServer.trigger(
      `private-conv-${conversation.id}`,
      "message:new",
      {
        message: "",
        conversationId: conversation.id,
      }
    );

    return NextResponse.json({ conversation: fullConversation });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
