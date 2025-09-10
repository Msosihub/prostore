// app/chat/[conversationId]/ChatPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import ChatWindow from "@/components/chatx/ChatWindow";
import { Loader } from "lucide-react";
import { ConversationLite, ProductLite } from "@/components/chatx/types";

export default function ChatPageClient({
  meId,
  conversationId,
}: {
  meId: string;
  conversationId: string;
}) {
  const [conversation, setConversation] = useState<ConversationLite | null>(
    null
  );

  useEffect(() => {
    // 1. Try to hydrate from sessionStorage
    const cached = sessionStorage.getItem(`conversation:${conversationId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.id === conversationId) {
        setConversation(parsed);
        sessionStorage.removeItem(`conversation:${conversationId}`); // clear after use
      }
    }

    // 2. Always fetch latest in background
    fetch(`/api/chat/${conversationId}/fetch_route`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.conversation) {
          setConversation(data.conversation);
          sessionStorage.setItem(
            `conversation:${conversationId}`,
            JSON.stringify(data.conversation)
          );
        }
      })
      .catch((err) => console.error("Fetch conversation error", err));
  }, [conversationId]);

  if (!conversation) {
    return (
      <div className="p-6 text-gray-500 flex flex-col justify-center items-center">
        <Loader className="w-8 h-8 animate-spin" />
        <p>Loading chat...</p>
      </div>
    );
  }

  const lastProductMessage = conversation.messages
    .filter((m) => m.product)
    .slice(-1)[0];
  const headerProduct: ProductLite | null = lastProductMessage?.product || null;

  return (
    <div className="container py-2 ">
      <ChatWindow
        meId={meId}
        conversation={conversation}
        headerProduct={headerProduct}
      />
    </div>
  );
}
