//Composer (input, attachments, reply, typing)
"use client";

import { useEffect, useState } from "react";
// import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadButton } from "@/lib/uploadthing";
import type { ProductLite, MessageLite } from "./types";
import { Camera, FileCheck2, Loader, Send } from "lucide-react";
type Props = {
  conversationId: string;
  product: ProductLite | null;
  replyTo?: MessageLite | null;
  onClearReply?: () => void;
  onProductUsed?: () => void;
};

type Att = { url: string; name?: string; mimeType?: string };

export default function Composer({
  conversationId,
  product,
  replyTo,
  onClearReply,
  onProductUsed,
}: Props) {
  const [value, setValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [attachments, setAttachments] = useState<Att[]>([]);

  type ComposerPayload = {
    content: string;
    attachments?: Att[];
    replyToId?: string;
    replyToInquiryId?: string;
    productId?: string;
  };

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
    // console.log("SMS ENTERED: ", text);
    if (!text && attachments.length === 0) return;

    const payload: ComposerPayload = { content: text };
    if (attachments.length) payload.attachments = attachments;
    if (replyTo?.id) payload.replyToId = replyTo.id;
    if (replyTo?.inquiry?.id) payload.replyToInquiryId = replyTo.inquiry.id;
    if (product) {
      payload.productId = product.id;
      // console.log("Creating Payload: ", product.id);
      onProductUsed?.(); // 👈 clear it after first use
    }

    // Clear UI optimistically; Pusher will append the message
    setValue("");
    setAttachments([]);
    onClearReply?.();

    // console.log("Conversation Id: ", conversationId);

    await fetch(`/api/chat/${conversationId}/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  return (
    <div className="border-t bg-white p-1 space-b-2 sticky bottom-0">
      {/* uploads row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* <UploadButton
          endpoint="quoteAttachment"
          appearance={{
            button: "bg-gray-500  hover:bg-orange-600 px-3 py-1 rounded-md",
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
          content={{
            button: (
              <Paperclip size={18} className="bg-gray-800" strokeWidth={2} />
            ),
          }}
        /> */}
        {uploadingCount > 0 && (
          <span className="flex flex-row gap-1 text-xs text-orange-600 mb-1 justify-center items-center">
            <Loader color="#ea580c" className=" animate-spin" />
            Inapakia…
          </span>
        )}
        {!!attachments.length && (
          <div className="flex flex-wrap gap-2 text-xs">
            {attachments.map((f, i) => (
              <span
                key={i}
                className="flex flex-row gap-1 px-2 py-1 bg-muted rounded-full justify-center items-center"
              >
                <FileCheck2 color="#25D366" /> {f.name || "File"}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="border-l-4 border-orange-500 bg-muted/30 p-2 text-sm relative rounded">
          <div className="font-medium text-[10px]">Replying to</div>
          <div className="line-clamp-1 text-muted-foreground text-xs">
            {replyTo.inquiry ? (
              <>
                {replyTo.inquiry.variant &&
                  `Variant: ${replyTo.inquiry.variant}`}
                {replyTo.inquiry.targetPrice &&
                  ` • Target: $${replyTo.inquiry.targetPrice}`}
                {replyTo.inquiry.notes &&
                  ` • Notes: $${replyTo.inquiry.notes.slice(0, 20)}`}
              </>
            ) : replyTo.product ? (
              <>🛒 {replyTo.product.name}</>
            ) : (
              <>{replyTo.content}</> // 👈 fall back to message text
            )}
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
      <div className="flex gap-1 items-center">
        <div className="relative flex-1">
          <div className=" rounded flex justify-center items-center ">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Write a message (avoid personal contact info)…"
              className="min-h-[56px] bg-gray-100 overflow-y-hidden  border-none mr-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className=" items-center">
              <UploadButton
                endpoint="quoteAttachment"
                appearance={{
                  allowedContent: "hidden",
                  button: "p-1",
                }}
                onUploadBegin={() => setUploadingCount((c) => c + 1)}
                onUploadError={() =>
                  setUploadingCount((c) => Math.max(0, c - 1))
                }
                onClientUploadComplete={(res) => {
                  // console.log("Upload respomse: ", res);
                  const files: Att[] = res.map(
                    (r: { url: string; name: string; type?: string }) => ({
                      url: r.url as string,
                      name: r.name as string | undefined,
                      mimeType: r.type,
                    })
                  );
                  setAttachments((prev) => [...prev, ...files]);
                  setUploadingCount((c) => Math.max(0, c - 1));
                }}
                content={{
                  button: (
                    <Camera
                      className="w-8 h-8"
                      color="#ea580c"
                      strokeWidth={2}
                    />
                  ),
                }}
              />
            </div>
          </div>
        </div>
        <button
          onClick={send}
          disabled={!canSend}
          className="bg-orange-500 hover:bg-orange-600 rounded-full flex justify-center items-center w-12 h-12 p-1"
        >
          <Send className="text-white w-7 h-7" />
        </button>
      </div>

      <div className="text-[10px] text-muted-foreground text-center">
        ⚠️ Kuepuka utapeli, usiwasiliane/kufanya malipo na muuzaji nje ya app
        hii. Maliza kila kitu hapa.
      </div>
    </div>
  );
}
