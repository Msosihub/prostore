//Composer (input, attachments, reply, typing)
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadButton } from "@/lib/uploadthing";
import type { ProductLite, MessageLite } from "./types";

type Props = {
  conversationId: string;
  product: ProductLite | null;
  replyTo?: MessageLite | null;
  onClearReply?: () => void;
};

type Att = { url: string; name?: string };

export default function Composer({
  conversationId,
  product,
  replyTo,
  onClearReply,
}: Props) {
  const [value, setValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [attachments, setAttachments] = useState<Att[]>([]);

  // Typing indicator (throttled)
  useEffect(() => {
    const sendTyping = (state: boolean) =>
      fetch(`/api/chat/${conversationId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: state }),
      }).catch(() => {});

    if (!value) {
      if (isTyping) {
        setIsTyping(false);
        sendTyping(false);
      }
      return;
    }

    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }

    const t = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false);
    }, 1200);
    return () => clearTimeout(t);
  }, [value, conversationId, isTyping]);

  const canSend = value.trim().length > 0 || attachments.length > 0;

  const send = async () => {
    const text = value.trim();
    if (!text && attachments.length === 0) return;

    const payload: any = { content: text };
    if (attachments.length) payload.attachments = attachments;
    if (replyTo) payload.replyToId = replyTo.id;
    if (product) payload.productId = product.id;

    // Clear UI optimistically; Pusher will append the message
    setValue("");
    setAttachments([]);
    onClearReply?.();

    await fetch(`/api/chat/${conversationId}/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  return (
    <div className="border-t bg-white p-3 space-y-2 sticky bottom-0">
      {/* uploads row */}
      <div className="flex items-center gap-2 flex-wrap">
        <UploadButton
          endpoint="quoteAttachment"
          appearance={{
            button:
              "bg-orange-500 text-white hover:bg-orange-600 px-3 py-1 rounded-md",
            label: "text-orange-700",
          }}
          onUploadBegin={() => setUploadingCount((c) => c + 1)}
          onUploadError={() => setUploadingCount((c) => Math.max(0, c - 1))}
          onClientUploadComplete={(res) => {
            const files: Att[] = res.map((r: any) => ({
              url: r.url as string,
              name: r.name as string | undefined,
            }));
            setAttachments((prev) => [...prev, ...files]);
            setUploadingCount((c) => Math.max(0, c - 1));
          }}
          content={{ button: "Attach (PDF, etc.)" }}
        />
        {uploadingCount > 0 && (
          <span className="text-xs text-orange-600">Uploading…</span>
        )}
        {!!attachments.length && (
          <div className="flex flex-wrap gap-2 text-xs">
            {attachments.map((f, i) => (
              <span key={i} className="px-2 py-1 bg-muted rounded-full">
                📎 {f.name || "File"}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="border-l-4 border-orange-500 bg-muted/30 p-2 text-sm relative rounded">
          <div className="font-medium">Replying to</div>
          <div className="line-clamp-1 text-muted-foreground">
            {replyTo.content}
          </div>
          <button
            onClick={onClearReply}
            className="absolute top-1 right-2 text-xs text-red-500"
            aria-label="Cancel reply"
          >
            ×
          </button>
        </div>
      )}

      {/* input row */}
      <div className="flex gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write a message (avoid personal contact info)…"
          className="min-h-[56px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button
          onClick={send}
          disabled={!canSend}
          className="shrink-0 bg-orange-500 hover:bg-orange-600"
        >
          Send
        </Button>
      </div>

      <div className="text-[11px] text-muted-foreground">
        ⚠️ Please avoid sharing personal phone/email. Messages may be moderated
        for safety.
      </div>
    </div>
  );
}
