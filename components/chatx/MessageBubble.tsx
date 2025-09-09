"use client";

import Link from "next/link";
import type { MessageLite } from "./types";
import { CornerUpLeft } from "lucide-react";
import ChatInquirySummary from "./ChatInquirySummary";
import { FileText } from "lucide-react";

type Props = {
  meId: string;
  message: MessageLite;
  onReply?: (
    m: MessageLite & {
      inquiry?: MessageLite["inquiry"];
      replySourceId?: string;
    }
  ) => void;
};

export default function MessageBubble({ meId, message, onReply }: Props) {
  const mine = message.senderId === meId;
  // Special case: Inquiry message in flow
  if (message.inquiry) {
    const date = new Date(message.sentAt).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return (
      <div id={`msg-${message.id}`} className="space-y-2">
        {/* Divider */}
        <div className="flex items-center justify-center my-4">
          <div className="h-px flex-1 bg-muted" />
          <span className="mx-2 text-xs text-muted-foreground">
            New Inquiry — {date}
          </span>
          <div className="h-px flex-1 bg-muted" />
        </div>

        {/* Inquiry bubble itself */}
        <ChatInquirySummary
          inquiry={message.inquiry}
          onReply={onReply}
          message={message}
        />
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "inline-block max-w-[80%]  break-words rounded-2xl px-3 py-2 shadow-sm  align-top",
          mine
            ? "bg-orange-500 text-white"
            : message.moderated
              ? "bg-yellow-100 border border-blue-300"
              : "bg-muted",
        ].join(" ")}
      >
        {/* Reply preview (if any) */}
        {/* Reply preview (if any) */}
        {message.replyTo && (
          <div
            className="whitespace-pre-wrap break-words mb-1 rounded-md px-2 py-1 text-xs italic bg-black/10 cursor-pointer hover:bg-black/20"
            onClick={() => {
              const el = document.getElementById(`msg-${message.replyTo!.id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-orange-400");
                setTimeout(
                  () => el.classList.remove("ring-2", "ring-orange-400"),
                  1200
                );
              }
            }}
          >
            <span className="font-semibold">
              {message.replyTo.senderId === meId
                ? "You"
                : message.replyTo.senderId || "User"}
            </span>
            :{" "}
            {message.replyTo.inquiry ? (
              <span className="not-italic text-[10px]">
                📩 Inquiry — {message.replyTo.inquiry.quantity || "?"}{" "}
                {message.replyTo.inquiry.unit || ""}
              </span>
            ) : (
              <>
                {message.replyTo.content.slice(0, 60)}
                {message.replyTo.content.length > 60 && "…"}
              </>
            )}
          </div>
        )}

        {/* Body */}
        {message.content && (
          <div
            className="whitespace-pre-wrap break-words "
            id={`msg-${message.id}`}
          >
            {message.content}
            {message.moderated && (
              <div className="mt-1 text-xs italic opacity-90">
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
                <FileText size={24} strokeWidth={2} />{" "}
                {att.name || "Attachment"}
              </a>
            ))}
          </div>
        )}

        {/* In-message product mention (if server attaches) */}
        {message.product && (
          <Link
            href={`/product/${message.product.id}`}
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
                <div className="font-medium line-clamp-1 text-gray-700">
                  {message.product.name}
                </div>
                <div className="text-muted-foreground">
                  {message.product.price}Tsh
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Meta + actions */}
        <div
          className={`mt-1 flex items-center gap-2 text-[8px] opacity-80 ${mine ? "text-white" : ""}`}
        >
          <span className="text-[11px]">
            {new Date(message.sentAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          {mine && (
            <span className="text-[11px]">
              {message.isRead ? "✔✔" : "✔"}
            </span>
          )}
          {onReply && (
            <button
              onClick={() => onReply(message)}
              className={`ml-2 inline-flex items-center gap-1 text-[11px] ${mine ? "text-white/90" : "text-foreground/70"}`}
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
