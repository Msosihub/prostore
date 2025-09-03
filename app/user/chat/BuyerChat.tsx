//6) Pages (examples)
// 6.1 Buyer inbox
import ConversationList from "@/components/chat/conversation-list";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

const BuyerChat = async () => {
  const session = await auth();
  if (!session) return null;

  const meId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: { buyerId: meId },
    include: {
      product: { select: { name: true } },
      messages: {
        where: { seen: false, NOT: { senderId: meId } },
        select: { id: true },
      },
      supplier: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const initial = conversations.map((c) => ({
    id: c.id,
    otherPartyName: c.supplier.name,
    product: c.product ? { name: c.product.name } : null,
    unreadCount: c.messages.length,
  }));

  return (
    <div className="max-w-2xl mx-auto p-4">
      <ConversationList meId={meId} role="BUYER" initial={initial} />
    </div>
  );
};

export default BuyerChat;
