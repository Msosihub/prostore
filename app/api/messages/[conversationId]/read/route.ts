//Mark read

import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher/server";
import z from "zod";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversationId = await params;

  const uuidSchema = z.string().uuid();

  const conversationIdSafe = uuidSchema.parse(conversationId);

  // mark all messages not from me as read
  const updated = await prisma.message.updateMany({
    where: {
      conversationId: conversationIdSafe,
      seen: false,
      NOT: { senderId: session.user.id },
    },
    data: { seen: true },
  });

  await pusherServer.trigger(`private-conv-${conversationId}`, "message:read", {
    readerId: session.user.id,
  });

  return NextResponse.json({ count: updated.count });
}
