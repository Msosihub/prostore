import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

import { conversationSelect, participantScope } from "@/lib/chat-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: participantScope(userId),
    select: conversationSelect,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(JSON.parse(JSON.stringify(conversations)));
}
