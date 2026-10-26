import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { participantScope } from "@/lib/chat-access";
import { prisma } from "@/db/prisma";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = z
    .object({ conversationId: z.string().uuid() })
    .strict()
    .safeParse(await req.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Invalid conversation" },
      { status: 400 },
    );
  const { conversationId } = input.data;
  const participant = await prisma.conversation.findFirst({
    where: { id: conversationId, ...participantScope(session.user.id) },
    select: { id: true },
  });
  if (!participant)
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );

  await prisma.message.updateMany({
    where: {
      conversationId,
      seen: false,
      senderId: {
        not: session.user.id,
      },
      conversation: {
        ...participantScope(session.user.id),
      },
    },
    data: {
      seen: true,
    },
  });

  return NextResponse.json({ success: true });
}
