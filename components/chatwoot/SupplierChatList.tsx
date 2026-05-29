// This handles the left sidebar search feed panel, displaying user names and message previews.

"use client";

import { User } from "lucide-react";

interface SupplierChatListProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversations: any[];
  activeId: string | null;
  onSelectChat: (id: string) => void;
}

export default function SupplierChatList({
  conversations,
  activeId,
  onSelectChat,
}: SupplierChatListProps) {
  return (
    <div className="flex-1 min-h-0  overflow-y-auto p-2 space-y-1">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelectChat(conv.id)}
          className={`w-full p-3 text-left rounded-xl transition-all border flex flex-col gap-1.5 ${
            conv.id === activeId
              ? "bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-100"
              : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {conv.buyer?.name || "Mteja wa Nimboya"}
            </div>
            <span className="text-[10px] text-slate-400">
              {conv.messages.length > 0 &&
                new Date(
                  conv.messages[conv.messages.length - 1].createdAt
                ).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium truncate max-w-full">
            {conv.Inquiry?.[0]?.product?.name
              ? `📦 ${conv.Inquiry[0].product.name}`
              : conv.Product?.name
                ? `📦 ${conv.Product.name}`
                : "Mjadala mkuu..."}
          </div>
          <p className="text-xs text-slate-400 truncate italic">
            {conv.messages[conv.messages.length - 1]?.content ||
              "Hakuna ujumbe uliotumwa bado..."}
          </p>
        </button>
      ))}
    </div>
  );
}
