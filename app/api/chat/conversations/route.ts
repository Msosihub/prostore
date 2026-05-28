import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { supplierId: userId }],
    },
    include: {
      buyer: {
        select: { id: true, name: true, image: true },
      },
      supplier: {
        select: { id: true, name: true, image: true },
      },
      Product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: true,
          stock: true,
        },
      },

      messages: {
        orderBy: { createdAt: "asc" },
      },
      Inquiry: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: true,
              stock: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(JSON.parse(JSON.stringify(conversations)));
}
