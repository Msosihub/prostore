"use server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { participantScope } from "@/lib/chat-access";
import { z } from "zod";

// Legacy records stay in their original tables. No provider access or writes.
export async function readChatHistory(thread?: string, page = 1) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const current = z.number().int().min(1).max(1000).parse(page);
  const scope = participantScope(session.user.id);
  if (!thread) {
    return {
      threads: await prisma.conversation.findMany({
        where: scope,
        select: { id: true, updatedAt: true },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (current - 1) * 20,
        take: 21,
      }),
      conversation: null,
    };
  }
  const id = z.string().uuid().parse(thread);
  return {
    threads: [],
    conversation: await prisma.conversation.findFirst({
      where: { id, ...scope },
      select: {
        id: true,
        messages: {
          select: { id: true, content: true, createdAt: true },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          skip: (current - 1) * 50,
          take: 51,
        },
      },
    }),
  };
}
