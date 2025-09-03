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
};

export default function ConversationList({
  meId,
  initial,
  role, // "BUYER" | "SUPPLIER"
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
      // You might fetch a normalized item from API; here’s a naive append
      setItems((prev) => [
        { id: conversation.id, otherPartyName: "", unreadCount: 1 },
        ...prev,
      ]);
    });
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [meId]);

  return (
    <div className="space-y-1">
      {items.map((c) => (
        <Link
          key={c.id}
          href={`/api/chat/${c.id}`}
          className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted"
        >
          <div className="truncate">
            <div className="font-medium">{c.otherPartyName}</div>
            {c.product?.name && (
              <div className="text-xs text-muted-foreground truncate">
                Product: {c.product.name}
              </div>
            )}
          </div>
          {c.unreadCount > 0 && (
            <Badge variant="secondary">{c.unreadCount}</Badge>
          )}
        </Link>
      ))}
    </div>
  );
}
