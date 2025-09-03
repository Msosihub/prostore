import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { buyerId, supplierId, productId, ...inquiryData } = data;

    // Step 1: Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        buyerId_supplierId_productId: { buyerId, supplierId, productId },
      },
      include: { messages: true, inquiry: true },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          buyerId,
          supplierId,
          productId,
        },
      });

      // notify supplier new conv
      await pusherServer.trigger(`private-user-${supplierId}`, "conv:new", {
        conversation,
      });
    }

    // Step 2: Create inquiry (linked to conversation)
    const inquiry = await prisma.inquiry.create({
      data: {
        conversationId: conversation.id,
        ...inquiryData,
      },
    });

    // Step 3: Insert system message
    const systemMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: buyerId,
        body: `📩 Buyer sent an inquiry regarding the product.`,
      },
    });

    // Step 4: Notify via Pusher
    await pusherServer.trigger(
      `private-conv-${conversation.id}`,
      "message:new",
      { message: systemMsg, conversationId: conversation.id }
    );

    //Notify supplier
    await pusherServer.trigger(`supplier-${supplierId}`, "new-inquiry", {
      inquiryId: inquiry.id,
      conversationId: conversation.id,
    });

    return NextResponse.json({ conversation, inquiry });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
