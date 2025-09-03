"use client";
import { useEffect } from "react";
import { pusherClient } from "@/lib/pusher/client";

export function useConversationChannel(
  conversationId: string,
  onMessage: (m: any) => void
) {
  useEffect(() => {
    if (!conversationId) return;

    const channel = pusherClient.subscribe(`conversation-${conversationId}`);
    const handler = (data: any) => onMessage(data);

    channel.bind("new-message", handler);

    return () => {
      channel.unbind("new-message", handler);
      pusherClient.unsubscribe(`conversation-${conversationId}`);
    };
  }, [conversationId, onMessage]);
}
