// This handles the central interactive chat log screen, structural system cards, and message submissions.

"use client";

import { useState, useEffect, useRef } from "react";
import { Send, ChevronLeft } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.bmsounds.online";

interface SupplierChatLogProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeChat: any;
  supplierUserId: string;
  onBackToList: () => void;
}

export default function SupplierChatLog({
  activeChat,
  supplierUserId,
  onBackToList,
}: SupplierChatLogProps) {
  const [text, setText] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages?.length]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const payloadText = text;
    setText("");

    try {
      await fetch(`${API_URL}/chatwoot/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeChat.id,
          chatwootConversationId: activeChat.chatwootConversationId,
          senderId: supplierUserId, // or currentUserId for buyer
          content: payloadText,
        }),
      });
    } catch (err) {
      console.error("Failed sending text transmission:", err);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-100">
      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToList}
            className="p-1 text-slate-500 hover:text-slate-800 md:hidden"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="w-9 h-9 rounded-full bg-slate-100 border text-slate-700 font-bold flex items-center justify-center text-sm">
            {(activeChat.buyer?.name || "M").charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {activeChat.buyer?.name}
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              {activeChat.buyer?.email || "Mteja Amethibitishwa"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/*  eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {activeChat.messages.map((msg: any) => {
          const isMe = msg.senderId === supplierUserId;
          const isSystemTemplate =
            msg.content.includes("**Inquiry ya Bidhaa**") ||
            msg.content.includes("**OFFER / B2B QUOTE**");

          if (isSystemTemplate) {
            return (
              <div key={msg.id} className="w-full flex justify-center my-2">
                <div className="bg-amber-50 border border-amber-200 text-slate-800 rounded-xl px-4 py-3 text-xs max-w-md shadow-sm space-y-1">
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-white text-slate-800 rounded-bl-none border border-slate-200"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
                <span
                  className={`text-[9px] text-right mt-1 block opacity-75 ${isMe ? "text-indigo-200" : "text-slate-400"}`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Andika majibu yako hapa..."
          className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all"
        />
        <button
          type="submit"
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
