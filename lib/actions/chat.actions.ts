"use server";

import { prisma } from "@/db/prisma";
import { convertToPlainObject } from "../utils";

export async function getConversation(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      buyer: true,
      supplier: true,
      product: {
        select: { id: true, name: true, slug: true, images: true, price: true },
      },
      inquiry: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderId: true,
          content: true,
          sentAt: true,
          seen: true,
          attachments: true,
          moderated: true,
          moderatedBy: true,
          moderatedAt: true,
        },
      },
    },
  });

  return convertToPlainObject(conversation);
}
