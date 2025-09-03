//Mark read

import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversationId = params.conversationId;

  // mark all messages not from me as read
  const updated = await prisma.message.updateMany({
    where: {
      conversationId,
      isRead: false,
      NOT: { senderId: session.user.id },
    },
    data: { isRead: true },
  });

  await pusherServer.trigger(`private-conv-${conversationId}`, "message:read", {
    readerId: session.user.id,
  });

  return NextResponse.json({ count: updated.count });
}
