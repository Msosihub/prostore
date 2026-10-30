"use server";

import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { convertToPlainObject } from "../utils";
import { conversationDetailSelect, participantScope } from "@/lib/chat-access";

export async function getConversation(conversationId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const id = z.string().uuid().parse(conversationId);
  const conversation = await prisma.conversation.findFirst({
    where: { id, ...participantScope(session.user.id) },
    select: conversationDetailSelect(id),
  });
  // There is no existing admin chat workflow; roles do not grant participation.
  return convertToPlainObject(conversation);
}
