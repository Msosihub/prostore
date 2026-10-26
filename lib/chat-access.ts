import "server-only";
import { Prisma } from "@prisma/client";

export function participantScope(
  userId: string,
): Prisma.ConversationWhereInput {
  if (!userId) throw new Error("Unauthorized");
  return { OR: [{ buyerId: userId }, { supplierId: userId }] };
}
const product = {
  id: true,
  name: true,
  slug: true,
  price: true,
  images: true,
  stock: true,
} as const;
const person = { id: true, name: true, image: true } as const;
const inquiry = {
  id: true,
  conversationId: true,
  productId: true,
  quantity: true,
  unit: true,
  variant: true,
  targetPrice: true,
  customization: true,
  shippingTerm: true,
  needSamples: true,
  notes: true,
  status: true,
  createdAt: true,
  details: true,
  subject: true,
  product: { select: product },
} as const;
const message = {
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  createdAt: true,
  seen: true,
  chatwootMessageId: true,
} as const;
// Only display/integration fields used by participant chat views. No full Users,
// supplier balances, moderation notes, or unrelated account/provider metadata.
export const conversationSelect = {
  id: true,
  buyerId: true,
  supplierId: true,
  createdAt: true,
  updatedAt: true,
  chatwootConversationId: true,
  buyer: { select: { ...person, email: true } },
  supplier: { select: person },
  Product: { select: product },
  Inquiry: { orderBy: { createdAt: "desc" }, select: inquiry },
  messages: { orderBy: { createdAt: "asc" }, select: message },
} satisfies Prisma.ConversationSelect;

export function conversationDetailSelect(conversationId: string) {
  return {
    ...conversationSelect,
    messages: {
      orderBy: { createdAt: "asc" as const },
      select: {
        ...message,
        sender: { select: { ...person, role: true } },
        product: { select: product },
        attachments: {
          select: { id: true, url: true, name: true, mimeType: true },
        },
        inquiry: { where: { conversationId }, select: inquiry },
        // Legacy cross-thread links must never expose another conversation.
        replyTo: {
          where: { conversationId },
          select: {
            ...message,
            sender: { select: person },
            inquiry: { where: { conversationId }, select: inquiry },
          },
        },
      },
    },
  } satisfies Prisma.ConversationSelect;
}
