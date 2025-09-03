//Conversation helpers

import { prisma } from "@/db/prisma";

export async function getOrCreateConversation(params: {
  buyerId: string;
  supplierId: string;
  productId?: string | null;
}) {
  const { buyerId, supplierId, productId } = params;
  const existing = await prisma.conversation.findFirst({
    where: { buyerId, supplierId, productId: productId ?? undefined },
    include: { product: true },
  });
  if (existing) return existing;

  const conv = await prisma.conversation.create({
    data: { buyerId, supplierId, productId: productId ?? null },
  });
  return conv;
}

// unread count for a user (either buyer or supplier)
export async function getUnreadCount(userId: string) {
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { supplierId: userId }] },
    select: { id: true },
  });
  const convIds = convs.map((c) => c.id);
  if (convIds.length === 0) return 0;

  return prisma.message.count({
    where: {
      conversationId: { in: convIds },
      isRead: false,
      // not sent by me:
      NOT: { senderId: userId },
    },
  });
}
