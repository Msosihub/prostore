import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "SUPPLIER") {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.message.count({
    where: {
      seen: false,
      senderId: {
        not: session.user.id,
      },
      conversation: {
        supplierId: session.user.id,
      },
    },
  });

  return NextResponse.json({ count });
}
