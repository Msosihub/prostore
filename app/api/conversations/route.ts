//Start/get conversation

import { NextResponse } from "next/server";
import { startConversationSchema } from "@/lib/validators/chat";
import { prisma } from "@/db/prisma";
import { getOrCreateConversation } from "@/lib/chat";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const json = await req.json();
    const parsed = startConversationSchema.parse(json);
    // console.log("PARSED", parsed);

    // Optional: assert the current user is buyer (or allow both sides to open)
    if (
      session.user.id !== parsed.buyerId &&
      session.user.id !== parsed.supplierId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conversation = await getOrCreateConversation(parsed);
    const convoId = await conversation.id;

    // If inquiry payload provided and no Inquiry yet, create one
    if (
      parsed.inquiry &&
      !(await prisma.inquiry.findFirst({
        where: { conversationId: convoId },
      }))
    ) {
      await prisma.inquiry.create({
        data: {
          conversationId: conversation.id,
          ...parsed.inquiry,
        },
      });
    }

    // notify supplier’s inbox (optional)
    await pusherServer.trigger(
      `private-user-${parsed.supplierId}`,
      "conv:new",
      { conversation }
    );

    return NextResponse.json({ conversation });
  } catch (e) {
    // console.log("CONVO", e);
    return NextResponse.json({ error: e ?? "Error" }, { status: 400 });
  }
}
