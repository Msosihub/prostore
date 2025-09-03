"use client";

import { useState } from "react";
import { useChat } from "ai/react"; // ✅ from Vercel AI SDK
import { Check, CheckCheck, Reply } from "lucide-react";

type ChatWindowProps = {
  conversationId: string;
  user: { id: string; role?: "BUYER" | "SUPPLIER" };
};

export default function ChatWindow({ conversationId, user }: ChatWindowProps) {
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat", // your API route
      body: { conversationId, userId: user.id },
    });

  return (
    <div className="flex flex-col flex-1">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col">
            {/* Quoted Reply */}
            {m.metadata?.replyTo && (
              <div className="text-xs text-gray-500 border-l-2 pl-2 mb-1">
                Replying to: {m.metadata.replyTo.slice(0, 40)}...
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={`p-3 rounded-2xl max-w-xs ${
                m.role === "user"
                  ? "bg-green-500 text-white self-end"
                  : "bg-gray-200 self-start"
              }`}
            >
              {m.content}
            </div>

            {/* Read Receipts */}
            {m.role === "user" && (
              <div className="flex items-center gap-1 text-xs text-gray-400 self-end">
                {m.metadata?.seen ? (
                  <CheckCheck className="w-4 h-4 text-blue-500" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </div>
            )}

            {/* Reply Action */}
            <button
              className="text-xs text-blue-500 mt-1 flex items-center gap-1"
              onClick={() => setReplyTo(m.content)}
            >
              <Reply className="w-3 h-3" /> Reply
            </button>
          </div>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="text-sm text-gray-500 animate-pulse">Typing...</div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e, {
            options: { body: { replyTo } },
          });
          setReplyTo(null);
        }}
        className="border-t p-2 flex gap-2"
      >
        {replyTo && (
          <div className="bg-gray-100 text-xs p-1 rounded">
            Replying to: {replyTo.slice(0, 40)}...
            <button
              type="button"
              className="ml-2 text-red-500"
              onClick={() => setReplyTo(null)}
            >
              ✕
            </button>
          </div>
        )}

        <input
          value={input}
          onChange={handleInputChange}
          className="flex-1 border rounded-lg px-3 py-2"
          placeholder="Type a message..."
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </form>
    </div>
  );
}
