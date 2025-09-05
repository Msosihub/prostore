// Container that ties it together

"use client";

import { useState } from "react";
import ChatHeader from "./ChatHeader";
import ChatInquirySummary from "./ChatInquirySummary";
import MessageList from "./MessageList";
import Composer from "./Composer";
import type { ConversationLite, MessageLite, ProductLite } from "./types";

type Props = {
  meId: string;
  conversation: ConversationLite; // server-fetched
  headerProduct: ProductLite | null;
  peerTimezone?: string; // optional future enhancement
};

export default function ChatWindow({
  meId,
  conversation,
  headerProduct,
  peerTimezone,
}: Props) {
  const { id: conversationId, buyer, supplier, messages } = conversation;

  const [activeProduct, setActiveProduct] = useState<ProductLite | null>(
    headerProduct || null
  );
  const [peerTyping, setPeerTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<MessageLite | null>(null);

  const latestInquiry = conversation.messages
    .filter((m) => m.inquiry)
    .slice(-1)[0]?.inquiry;

  return (
    <div className="flex flex-col h-screen border rounded-lg bg-background">
      {/* Header - fixed height */}
      <div className="flex-none">
        <ChatHeader
          meId={meId}
          buyer={buyer}
          supplier={supplier}
          product={activeProduct}
          onRemoveProduct={() => setActiveProduct(null)}
          peerTyping={peerTyping}
          peerTimezone={peerTimezone}
        />
      </div>

      {/* Message list - scrollable */}
      <div className="flex-1 overflow-y-auto">
        <MessageList
          meId={meId}
          conversationId={conversationId}
          initialMessages={messages}
          pinnedInquiry={latestInquiry}
          onReply={(m) => setReplyTo(m)}
          onPeerTypingChange={setPeerTyping}
        />
      </div>

      {/* Composer - fixed height */}
      <div className="flex-none">
        <Composer
          conversationId={conversationId}
          product={activeProduct}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
}
