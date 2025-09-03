// app/chat/[conversationId]/page.tsx
// import ChatWindow from "./ChatWindow";
import { auth } from "@/auth"; // your server auth helper
import ChatWindow from "@/components/chatx/ChatWindow";
import { getConversation } from "@/lib/actions/chat.actions";

export default async function Page({
  params,
}: {
  params: { conversationId: string };
}) {
  const session = await auth();
  const meId = session!.user.id;
  const { conversationId } = await params;

  const conversation = await getConversation(conversationId);

  if (!conversation) return null;

  return (
    <div className="container py-6">
      <ChatWindow meId={meId} conversation={conversation as any} />
    </div>
  );
}
