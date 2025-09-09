// app/api/unread-messages/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth"; // or getServerSession
import { prisma } from "@/db/prisma";

export async function GET() {
  const session = await auth(); // or getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ unread: 0 });
  }

  const userId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { supplierId: userId }],
    },
    include: {
      messages: {
        where: { seen: false, senderId: { not: userId } },
      },
    },
  });

  const unread = conversations.reduce(
    (acc, conv) => acc + conv.messages.length,
    0
  );

  return NextResponse.json({ unread });
}
