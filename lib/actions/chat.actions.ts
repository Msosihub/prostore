"use server";

import { prisma } from "@/db/prisma";
import { convertToPlainObject } from "../utils";

export async function getConversation(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      buyer: true,
      supplier: {
        include: {
          Supplier: true, // 👈 this assumes User → Supplier relation exists
        },
      },
      Inquiry: true,
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          replyTo: {
            include: {
              inquiry: true, // so we can render 📩 summary
              sender: { select: { id: true, name: true } },
            },
          },
          // ✅ include product
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
              price: true,
            },
          },

          attachments: true,
          inquiry: true,
        },
      },
    },
  });

  return convertToPlainObject(conversation);
}
