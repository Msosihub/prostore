//6) Pages (examples)
// 6.1 Buyer inbox
import ConversationList from "@/components/chat/conversation-list";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import BottomNav from "@/components/customComponents/bottom-nav-main";

export default async function BuyerChat() {
  const session = await auth();
  if (!session) return null;

  const meId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: { buyerId: meId },
    include: {
      supplier: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, createdAt: true, senderId: true },
      },
      _count: {
        select: {
          messages: {
            where: { seen: false, NOT: { senderId: meId } },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const initial = conversations.map((c) => ({
    id: c.id,
    otherPartyName: c.supplier.name,
    lastMessage: c?.messages[0]?.content || "New conversation",
    unreadCount: c._count.messages,
  }));

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-lg font-semibold mb-3">Messages</h1>
      <ConversationList meId={meId || ""} role="BUYER" initial={initial} />
      <BottomNav />
    </div>
  );
}
