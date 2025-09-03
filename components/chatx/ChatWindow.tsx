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
  peerTimezone?: string; // optional future enhancement
};

export default function ChatWindow({
  meId,
  conversation,
  peerTimezone,
}: Props) {
  const {
    id: conversationId,
    buyer,
    supplier,
    product,
    inquiry,
    messages,
  } = conversation;

  const [activeProduct, setActiveProduct] = useState<ProductLite | null>(
    product || null
  );
  const [peerTyping, setPeerTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<MessageLite | null>(null);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col border rounded-lg overflow-hidden bg-background">
      <ChatHeader
        meId={meId}
        buyer={buyer}
        supplier={supplier}
        product={activeProduct}
        onRemoveProduct={() => setActiveProduct(null)}
        peerTyping={peerTyping}
        peerTimezone={peerTimezone}
      />

      <div className="flex-1 overflow-y-auto">
        {inquiry && <ChatInquirySummary inquiry={inquiry} />}
        <MessageList
          meId={meId}
          conversationId={conversationId}
          initialMessages={messages}
          onReply={(m) => setReplyTo(m)}
          onPeerTypingChange={setPeerTyping}
        />
      </div>

      <Composer
        conversationId={conversationId}
        product={activeProduct}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </div>
  );
}
