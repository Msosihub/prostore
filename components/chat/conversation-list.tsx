//Client components
// 5.1 Conversation List (buyer or supplier inbox)

"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { pusherClient } from "@/lib/pusher/client";

type ConversationItem = {
  id: string;
  product?: { name: string } | null;
  otherPartyName: string; // computed server-side
  unreadCount: number;
  lastMessage: string;
  typing?: boolean;
};

export default function ConversationList({
  meId,
  initial,
}: {
  meId: string;
  role: "BUYER" | "SUPPLIER";
  initial: ConversationItem[];
}) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    if (!pusherClient) return;
    const channel = pusherClient.subscribe(`private-user-${meId}`);

    channel.bind("conv:new", ({ conversation }: any) => {
      setItems((prev) => [
        {
          id: conversation.id,
          otherPartyName: conversation.otherPartyName,
          product: conversation.product,
          lastMessage: conversation.lastMessage || "New conversation",
          unreadCount: 1,
        },
        ...prev,
      ]);
    });

    channel.bind("msg:new", ({ conversationId, message }: any) => {
      setItems((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                unreadCount: c.unreadCount + 1,
                lastMessage: message.content,
              }
            : c
        )
      );
    });

    channel.bind("msg:read", ({ conversationId }: any) => {
      setItems((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );
    });

    // 🔥 typing indicator
    channel.bind("msg:typing", ({ conversationId }: any) => {
      setItems((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, typing: true } : c))
      );
      setTimeout(() => {
        setItems((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, typing: false } : c
          )
        );
      }, 3000);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [meId]);

  return (
    <div className="divide-y divide-muted rounded-lg border">
      {items.map((c) => (
        <Link
          key={c.id}
          href={`/api/chat/${c.id}`}
          className="flex items-center justify-between p-4 hover:bg-muted transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="truncate">
              <div className="font-medium">{c.otherPartyName}</div>
              <div className="text-xs text-muted-foreground truncate">
                {c.typing ? "Typing…" : c.lastMessage}
              </div>
            </div>
          </div>

          {c.unreadCount > 0 && (
            <Badge className="ml-2 bg-orange-500 text-white">
              {c.unreadCount}
            </Badge>
          )}
        </Link>
      ))}
    </div>
  );
}
