//Message list (Pusher, read receipts, scroll)

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pusherClient } from "@/lib/pusher/client";
import MessageBubble from "./MessageBubble";
import type { InquiryLite, MessageLite } from "./types";

type Props = {
  meId: string;
  conversationId: string;
  initialMessages: MessageLite[];
  pinnedInquiry?: InquiryLite;
  onReply?: (m: MessageLite) => void;
  onPeerTypingChange?: (isTyping: boolean) => void;
};

export default function MessageList({
  meId,
  conversationId,
  initialMessages,
  onReply,
  onPeerTypingChange,
}: Props) {
  const [messages, setMessages] = useState<MessageLite[]>(
    () => initialMessages || []
  );
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const channelName = useMemo(
    () => `private-conv-${conversationId}`,
    [conversationId]
  );

  // Scroll helper
  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  // Pusher bindings
  useEffect(() => {
    const ch = pusherClient.subscribe(channelName);

    const onNewMessage = (payload: {
      message: MessageLite;
      conversationId: string;
    }) => {
      setMessages((prev) => [...prev, payload.message]);
    };
    const onRead = (payload: { messageId: string; readerId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId ? { ...m, isRead: true } : m
        )
      );
    };
    const onTyping = (payload: { userId: string; isTyping: boolean }) => {
      if (payload.userId !== meId) onPeerTypingChange?.(payload.isTyping);
    };

    ch.bind("msg:new", onNewMessage);
    ch.bind("msg:read", onRead);
    ch.bind("typing", onTyping);

    return () => {
      ch.unbind("msg:new", onNewMessage);
      ch.unbind("msg:read", onRead);
      ch.unbind("typing", onTyping);
      pusherClient.unsubscribe(channelName);
    };
  }, [channelName, meId, onPeerTypingChange]);

  // auto scroll on new message
  useEffect(() => {
    scrollToBottom(messages.length <= 2 ? false : true);
  }, [messages.length]);

  // mark incoming as read
  useEffect(() => {
    const unseen = messages.filter((m) => m.senderId !== meId && !m.isRead);
    if (unseen.length > 0) {
      fetch(`/api/chat/${conversationId}/route`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: unseen.map((m) => m.id) }),
      }).catch(() => {});
    }
  }, [messages, meId, conversationId]);

  return (
    <div className="px-3 py-3 space-y-3  overflow-x-hidden">
      {/* Inquiry pinned at top */}
      {/* {pinnedInquiry && <ChatInquirySummary inquiry={pinnedInquiry} />} */}

      {/* Actual messages */}
      {messages.map((m) => (
        <MessageBubble key={m.id} meId={meId} message={m} onReply={onReply} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
