import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId, ...payload } = await req.json();
  if (!conversationId)
    return NextResponse.json(
      { error: "conversationId required" },
      { status: 400 }
    );

  const inquiry = await prisma.inquiry.upsert({
    where: { conversationId },
    update: { ...payload },
    create: { conversationId, ...payload },
  });

  return NextResponse.json(inquiry);
}
