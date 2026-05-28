// This component handles switching between chat threads,
// lists active message states, and opens your custom, real - time live connection loop.
"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Store, Package } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.bmsounds.online";

export default function ChatWindow({
  initialConversations,
  currentUserId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialConversations: any[];
  currentUserId: string;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    conversations[0]?.id || null
  );
  const [text, setText] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);

  // 🆕 AUTO-FOCUS INCOMING PRODUCTS FROM PRODUCT PAGES
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const productUrlParamId = urlParams.get("selectProduct");

      if (productUrlParamId) {
        // Look through existing chats to find one matching this productId reference
        const matchingConversation = conversations.find(
          (conv) =>
            conv.productId === productUrlParamId ||
            conv.Product?.id === productUrlParamId
        );

        if (matchingConversation) {
          // Set this chat room active immediately
          setActiveId(matchingConversation.id);
        }
      }
    }
  }, [conversations]);

  const activeChat = conversations.find((c) => c.id === activeId);

  // 1. Establish the Real-Time Event Stream Connection
  useEffect(() => {
    const eventSource = new EventSource("/api/chat/stream");

    eventSource.onmessage = (event) => {
      try {
        const incomingMsg = JSON.parse(event.data);

        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id === incomingMsg.conversationId) {
              // Avoid adding duplicate messages to the array
              const exists = conv.messages.some(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (m: any) =>
                  m.id === incomingMsg.id ||
                  m.chatwootMessageId === incomingMsg.chatwootMessageId
              );
              return {
                ...conv,
                messages: exists
                  ? conv.messages
                  : [...conv.messages, incomingMsg],
                updatedAt: new Date().toISOString(),
              };
            }
            return conv;
          })
        );
      } catch (err) {
        console.error("Error reading SSE stream data packet:", err);
      }
    };

    return () => eventSource.close();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/chat/conversations");
      if (!res.ok) return;

      const data = await res.json();
      setConversations(data);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to the newest message whenever the active thread changes or updates
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages?.length, activeId]);

  // 2. Submit New Outgoing Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;

    const messageContent = text;
    setText("");

    // Optimistically update the UI locally for an instant response feel
    const tempId = Math.random().toString();
    const optimisticMsg = {
      id: tempId,
      conversationId: activeChat.id,
      senderId: currentUserId,
      content: messageContent,
      createdAt: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, messages: [...c.messages, optimisticMsg] }
          : c
      )
    );

    // Send the message to your backend API route
    try {
      await fetch(`${API_URL}/chatwoot/message`, {
        // Your Ubuntu NestJS API URL route entry point
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeChat.id,
          chatwootConversationId: activeChat.chatwootConversationId,
          senderId: currentUserId,
          content: messageContent,
        }),
      });
    } catch (err) {
      console.error("Failed to dispatch outgoing chat packet to backend:", err);
    }
  };

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex">
      {/* LEFT SIDEBAR PANEL: CONVERSATION SELECTION THREADS */}
      <div className="w-1/3 border-r border-slate-200 h-full flex flex-col bg-slate-50">
        <div className="p-4 border-b bg-white text-sm font-bold text-slate-700">
          Ujumbe Wako (My Messages)
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={`w-full p-3 text-left rounded-lg transition-colors flex flex-col gap-1 ${conv.id === activeId ? "bg-indigo-50 border border-indigo-200" : "hover:bg-white border border-transparent"}`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
                <Store className="w-3.5 h-3.5 text-indigo-500" />
                {conv.supplier?.name || "Msambazaji Nimboya"}
              </div>
              <p className="text-xs text-slate-500 truncate max-w-full">
                {conv.messages[conv.messages.length - 1]?.content ||
                  "Anza mazungumzo..."}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT CHAT LOG PANEL VIEW WINDOW */}
      <div className="flex-1 h-full flex flex-col bg-slate-100">
        {activeChat ? (
          <>
            {/* Header Ribbon Info Layout Display Component */}
            <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {(activeChat.supplier?.name || "S")[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {activeChat.supplier?.name}
                  </h4>
                  <p className="text-[10px] text-green-600 font-medium">
                    Hali: Mtandaoni (Active)
                  </p>
                </div>
              </div>

              {/* Alibaba-Style Context Ribbon Frame Container */}
              {activeChat.Product && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 max-w-sm">
                  <div className="w-8 h-8 bg-white rounded border overflow-hidden flex-shrink-0">
                    <img
                      src={activeChat.Product.images?.[0] || "/placeholder.png"}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  </div>
                  <div className="text-left leading-tight truncate">
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {activeChat.Product.name}
                    </p>
                    <p className="text-[10px] text-orange-600 font-bold">
                      TSh {Number(activeChat.Product.price).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Body Window Grid View Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/*  eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {activeChat.messages.map((msg: any) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isMe ? "bg-indigo-600 text-white rounded-br-none" : "bg-white text-slate-800 rounded-bl-none border border-slate-200"}`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <p
                        className={`text-[9px] text-right mt-1 block opacity-70 ${isMe ? "text-indigo-200" : "text-slate-400"}`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>

            {/* Bottom Form Action Bar Input Trigger */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Andika ujumbe wako hapa..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white transition"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Package className="w-12 h-12 stroke-1" />
            <p className="text-sm">Chagua mazungumzo ili kuanza chati</p>
          </div>
        )}
      </div>
    </div>
  );
}
