"use client";

import Link from "next/link";
import type { MessageLite } from "./types";
import { CornerUpLeft } from "lucide-react";

type Props = {
  meId: string;
  message: MessageLite;
  onReply?: (m: MessageLite) => void;
};

export default function MessageBubble({ meId, message, onReply }: Props) {
  const mine = message.senderId === meId;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[80%] rounded-2xl px-3 py-2 shadow-sm",
          mine
            ? "bg-orange-500 text-white"
            : message.moderated
              ? "bg-yellow-100 border border-blue-300"
              : "bg-muted",
        ].join(" ")}
      >
        {/* Reply preview (if any) */}
        {message.replyTo && (
          <div
            className={`mb-1 rounded-md px-2 py-1 text-xs italic ${mine ? "bg-black/10" : "bg-black/10"}`}
          >
            <span className="font-semibold">
              {message.replyTo.senderId === meId ? "You" : "User"}
            </span>
            : {message.replyTo.content.slice(0, 80)}
            {message.replyTo.content.length > 80 && "…"}
          </div>
        )}

        {/* Body */}
        {message.content && (
          <div className="whitespace-pre-wrap">
            {message.content}
            {message.moderated && (
              <div className="mt-1 text-[11px] italic opacity-90">
                Message was adjusted for safety.
              </div>
            )}
          </div>
        )}

        {/* Attachments */}
        {!!message.attachments?.length && (
          <div className="mt-2 space-y-1">
            {message.attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className={`${mine ? "text-white underline" : "text-primary underline"} text-xs`}
              >
                📎 {att.name || "Attachment"}
              </a>
            ))}
          </div>
        )}

        {/* In-message product mention (if server attaches) */}
        {message.product && (
          <Link
            href={`/product/${message.product.slug}`}
            className="mt-2 block rounded-md border bg-white overflow-hidden"
          >
            <div className="flex items-center gap-2 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.product.images?.[0]}
                alt={message.product.name}
                className="h-12 w-12 object-cover rounded"
              />
              <div className="flex-1 text-xs">
                <div className="font-medium line-clamp-1">
                  {message.product.name}
                </div>
                <div className="text-muted-foreground">
                  ${message.product.price}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Meta + actions */}
        <div
          className={`mt-1 flex items-center gap-2 text-[10px] opacity-80 ${mine ? "text-white" : ""}`}
        >
          <span>
            {new Date(message.sentAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          {mine && <span>{message.isRead ? "✔✔ Seen" : "✔ Sent"}</span>}
          {onReply && (
            <button
              onClick={() => onReply(message)}
              className={`ml-2 inline-flex items-center gap-1 text-[10px] ${mine ? "text-white/90" : "text-foreground/70"}`}
              title="Reply"
            >
              <CornerUpLeft className="h-3 w-3" />
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
