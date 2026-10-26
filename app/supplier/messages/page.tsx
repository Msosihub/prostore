import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/db/prisma";
import { conversationSelect } from "@/lib/chat-access";
import SupplierChatWindow from "@/components/chatwoot/SupplierChatWindow";

export default async function SupplierMessagesPage() {
  const session = await auth();

  // Verify user authentication state and restrict access if they aren't a Supplier
  if (!session?.user?.id || session.user.role !== "SUPPLIER") {
    redirect("/sign-in?callbackUrl=/supplier/messages");
  }

  // Fetch all recent conversations where this specific user is the assigned supplier
  const conversations = await prisma.conversation.findMany({
    where: { supplierId: session.user.id },
    select: conversationSelect,
    orderBy: { updatedAt: "desc" },
  });

  //const safeConversations = JSON.parse(JSON.stringify(conversations));
  const safeConversations = JSON.parse(
    JSON.stringify(
      conversations.map((conv) => ({
        ...conv,
        unreadCount: conv.messages.filter(
          (message) => !message.seen && message.senderId !== session.user.id,
        ).length,
      })),
    ),
  );

  return (
    <div className="fixed inset-0 pt-[80px] bg-slate-50 overflow-hidden z-40">
      <div className="w-full h-full min-h-0 overflow-hidden">
        <SupplierChatWindow
          initialConversations={safeConversations}
          supplierUserId={session.user.id || ""}
        />
      </div>
    </div>
  );
}

// This server component verifies the supplier's active session,
// queries your shared Neon database to fetch the conversation historical logs,
// and maps the associated B2B inquiries automatically.

// Because B2B suppliers must manage pricing negotiations, bulk orders, and shipping timelines directly from the chat screen,
// the interface will feature a Three-Column Split Layout on desktop that stacks into a clean mobile-responsive view:
// 1. Left Column: The list of active incoming buyer message threads with a badge showing unread counts.
// 2. Center Column: The active chat log with instantaneous real-time Server-Sent Events (SSE) message streaming.
// 3. Right Column (Context Sidebar): An interactive B2B panel showing the direct buyer details, the target product specification ribbon,
//  and an instant actionable "Tengeneza Quote / Generate B2B Quote" control panel. This lets suppliers submit financial quotes straight into the chat window.
