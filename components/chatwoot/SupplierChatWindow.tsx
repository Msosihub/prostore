"use client";

import { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";
import SupplierChatList from "./SupplierChatList";
import SupplierChatLog from "./SupplierChatLog";
import SupplierChatContext from "./SupplierChatContext";

interface SupplierChatWindowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialConversations: any[];
  supplierUserId: string;
}

export default function SupplierChatWindow({
  initialConversations,
  supplierUserId,
}: SupplierChatWindowProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    conversations[0]?.id || null
  );
  const [viewMode, setViewMode] = useState<"list" | "chat">("list");

  const activeChat = conversations.find((c) => c.id === activeId);

  // Establish persistent Server-Sent Events stream pipeline listener for live incoming text tracking
  // useEffect(() => {
  //   const eventSource = new EventSource("/api/chat/stream");

  //   eventSource.onmessage = (event) => {
  //     try {
  //       const incomingMsg = JSON.parse(event.data);

  //       setConversations((prev) =>
  //         prev.map((conv) => {
  //           if (conv.id === incomingMsg.conversationId) {
  //             const messageExists = conv.messages.some(
  //               // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //               (m: any) =>
  //                 m.id === incomingMsg.id ||
  //                 m.chatwootMessageId === incomingMsg.chatwootMessageId
  //             );
  //             return {
  //               ...conv,
  //               messages: messageExists
  //                 ? conv.messages
  //                 : [...conv.messages, incomingMsg],
  //               updatedAt: new Date().toISOString(),
  //             };
  //           }
  //           return conv;
  //         })
  //       );
  //     } catch (err) {
  //       console.error(
  //         "Error parsing incoming dynamic real-time stream packet:",
  //         err
  //       );
  //     }
  //   };

  //   return () => eventSource.close();
  // }, []);

  //polling
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/chat/conversations");
      if (!res.ok) return;

      const data = await res.json();

      setConversations(data);

      setActiveId((current) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (current && data.some((c: any) => c.id === current)) {
          return current;
        }

        return data[0]?.id || null;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectChat = (id: string) => {
    setActiveId(id);
    setViewMode("chat");
  };

  return (
    <div className="w-full h-full flex bg-white border-t border-slate-200 overflow-hidden">
      {/* COLUMN 1: BUYER CONVERSATION INBOX THREADS */}
      <div
        className={`w-full md:w-80 border-r border-slate-200 h-full flex flex-col bg-slate-50 flex-shrink-0 ${
          viewMode === "chat" ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 bg-white border-b border-slate-200 font-bold text-slate-800 text-base flex justify-between items-center">
          <span>Inquiries za Wanunuzi</span>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {conversations.length}
          </span>
        </div>
        <SupplierChatList
          conversations={conversations}
          activeId={activeId}
          onSelectChat={handleSelectChat}
        />
      </div>

      {/* COLUMN 2: MAIN WORKSPACE MESSAGE VIEWPORT LOG */}
      <div
        className={`flex-1 h-full flex flex-col bg-slate-100 ${viewMode === "list" ? "hidden md:flex" : "flex"}`}
      >
        {activeChat ? (
          <SupplierChatLog
            activeChat={activeChat}
            supplierUserId={supplierUserId}
            onBackToList={() => setViewMode("list")}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
            <ShoppingBag className="w-12 h-12 stroke-1" />
            <p className="text-sm">
              Chagua inquiry ya mnunuzi ili kuanza mazungumzo
            </p>
          </div>
        )}
      </div>

      {/* COLUMN 3: SIDEBAR B2B COMMERCIAL NEGOTIATIONS ENGINE TERMINAL */}
      {activeChat && activeChat.Product && (
        <SupplierChatContext
          activeChat={activeChat}
          supplierUserId={supplierUserId}
        />
      )}
    </div>
  );
}
