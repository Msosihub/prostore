import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supplierId, productId } = await req.json();
  if (!supplierId)
    return NextResponse.json({ error: "supplierId required" }, { status: 400 });

  const buyerId = session.user.id;

  const convo = await prisma.conversation.upsert({
    where: {
      buyerId_supplierId_productId: {
        buyerId,
        supplierId,
        productId: productId ?? null,
      },
    },
    update: {},
    create: {
      buyerId,
      supplierId,
      productId: productId ?? undefined,
    },
    include: { inquiry: true },
  });

  return NextResponse.json(convo);
}
