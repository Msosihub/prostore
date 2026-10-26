import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/db/prisma";
import { conversationSelect } from "@/lib/chat-access";
import ChatWindow from "@/components/chatwoot/ChatWindow";

export default async function BuyerChatPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/buyer/chat");
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      buyerId: session.user.id,
    },
    select: conversationSelect,

    orderBy: {
      updatedAt: "desc",
    },
  });

  const safeConversation = JSON.parse(JSON.stringify(conversations));
  return (
    <div className="fixed inset-0 pt-[80px] bg-slate-50 overflow-hidden z-40">
      <div className="w-full h-full min-h-0 overflow-hidden">
        <ChatWindow
          initialConversations={safeConversation}
          currentUserId={session.user.id || ""}
        />
      </div>
    </div>
  );
}
