import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await req.json();

  await prisma.message.updateMany({
    where: {
      conversationId,
      seen: false,
      senderId: {
        not: session.user.id,
      },
      conversation: {
        OR: [{ supplierId: session.user.id }, { buyerId: session.user.id }],
      },
    },
    data: {
      seen: true,
    },
  });

  return NextResponse.json({ success: true });
}
