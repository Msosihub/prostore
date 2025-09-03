import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(req: Request) {
  console.log("IN CHAT NOW");
  try {
    const { buyerId, supplierId, productId, supplierUserId } = await req.json();
    console.log("Incoming data:", {
      buyerId,
      supplierId,
      productId,
      supplierUserId,
    });

    // Find or create conversation by ONLY buyer + supplier
    let conversation = await prisma.conversation.findUnique({
      where: {
        buyerId_supplierId: {
          buyerId,
          supplierId: supplierUserId,
        },
      },
    });
    //the supplierId(in supplierModel) is supplierUserId in UserModel
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { buyerId, supplierId: supplierUserId, productId },
      });

      // notify supplier of new conversation
      await pusherServer.trigger(`private-user-${supplierId}`, "conv:new", {
        conversation,
      });
    }

    // ✅ If productId is passed, we just attach it in the message, not in conversation
    return NextResponse.json({ conversation });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
