"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pusherClient } from "@/lib/pusher/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UploadButton } from "@/lib/uploadthing";
import Link from "next/link";

type UserLite = {
  id: string;
  name?: string | null;
  image?: string | null;
};

type ProductLite = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  price: string; // string because Decimal -> JSON
};

type InquiryLite = {
  id: string;
  quantity?: number | null;
  unit?: string | null;
  variant?: string | null;
  targetPrice?: string | null; // Decimal -> string
  customization?: boolean | null;
  shippingTerm?: string | null;
  needSamples?: boolean | null;
  notes?: string | null;
  status: "PENDING" | "QUOTED" | "CLOSED";
};

type MessageLite = {
  id: string;
  senderId: string;
  content: string;
  sentAt: string; // ISO
  isRead: boolean;
  attachments?: Array<{ name?: string; url: string }> | null;
  replyTo?: MessageLite | null;
  moderated?: boolean;
};

type ConversationLite = {
  id: string;
  buyer: UserLite;
  supplier: UserLite;
  product?: ProductLite | null;
  inquiry?: InquiryLite | null;
  messages: MessageLite[];
};

type Props = {
  meId: string; // current user id
  conversation: ConversationLite; // preloaded from server (page.tsx)
};

export default function ChatWindow({ meId, conversation }: Props) {
  const { id: conversationId, product, inquiry } = conversation;

  const [messages, setMessages] = useState<MessageLite[]>(
    () => conversation.messages || []
  );
  const [replyTo, setReplyTo] = useState<MessageLite | null>(null);

  const [value, setValue] = useState("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [peerTyping, setPeerTyping] = useState<boolean>(false);
  const [uploadingCount, setUploadingCount] = useState<number>(0);
  const [attachments, setAttachments] = useState<
    Array<{ url: string; name?: string }>
  >([]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const channelName = useMemo(
    () => `private-conv-${conversationId}`,
    [conversationId]
  );

  // Scroll to bottom helper
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Pusher bindings
  useEffect(() => {
    const channel = pusherClient.subscribe(channelName);

    const onNewMessage = (payload: {
      message: MessageLite;
      conversationId: string;
    }) => {
      setMessages((prev) => [...prev, payload.message]);
    };

    const onRead = (payload: { messageId: string; readerId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId ? { ...m, isRead: true } : m
        )
      );
    };

    const onTyping = (payload: { userId: string; isTyping: boolean }) => {
      if (payload.userId !== meId) setPeerTyping(payload.isTyping);
    };

    channel.bind("message:new", onNewMessage);
    channel.bind("message:read", onRead);
    channel.bind("typing", onTyping);

    return () => {
      channel.unbind("message:new", onNewMessage);
      channel.unbind("message:read", onRead);
      channel.unbind("typing", onTyping);
      pusherClient.unsubscribe(channelName);
    };
  }, [channelName, meId]);

  // Autoscroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // Mark messages as read when receiving from the other user
  useEffect(() => {
    const unseen = messages.filter((m) => m.senderId !== meId && !m.isRead);
    if (unseen.length > 0) {
      fetch(`/api/chat/${conversationId}/route`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: unseen.map((m) => m.id) }),
      }).catch(() => {});
    }
  }, [messages, meId, conversationId]);

  // Typing signal (throttle-ish)
  useEffect(() => {
    if (!value) {
      if (isTyping) {
        setIsTyping(false);
        fetch(`/api/chat/${conversationId}/typing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTyping: false }),
        }).catch(() => {});
      }
      return;
    }
    if (!isTyping) {
      setIsTyping(true);
      fetch(`/api/chat/${conversationId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: true }),
      }).catch(() => {});
    }
    const t = setTimeout(() => {
      setIsTyping(false);
      fetch(`/api/chat/${conversationId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: false }),
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [value, conversationId, isTyping]);

  const send = async () => {
    const text = value.trim();
    if (!text && attachments.length === 0) return;

    const payload: any = { content: text, attachments };
    if (attachments.length) payload.attachments = attachments;
    if (replyTo) {
      payload.replyToId = replyTo.id;
    }

    if (product) {
      payload.productId = product.id;
    }

    // optional: attach inquiry if not exists & product present — minimal example
    // (uncomment if you want auto-attach a “hi, I’m interested” inquiry)
    // if (!conversation.inquiry && product) {
    //   payload.inquiryData = { notes: `Ninavutiwa na: ${product.name}` };
    // }

    setValue("");
    setAttachments([]);
    setReplyTo(null); // reset after sending

    await fetch(`/api/chat/${conversationId}/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/40">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                conversation.buyer.id === meId
                  ? (conversation.supplier.image ?? "")
                  : (conversation.buyer.image ?? "")
              }
            />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <div className="font-medium">
              {conversation.buyer.id === meId
                ? conversation.supplier.name || "Muuzaji"
                : conversation.buyer.name || "Mnunuzi"}
            </div>
            {peerTyping && (
              <div className="text-xs text-green-600">Anaandika…</div>
            )}
          </div>
        </div>

        {/* Product chip */}
        {product && (
          <Link
            href={`/product/${product.slug}`}
            className="flex items-center gap-2 group"
          >
            <div className="h-8 w-8 overflow-hidden rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.images?.[0]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="hidden sm:block text-sm">
              <div className="font-medium line-clamp-1">{product.name}</div>
              <div className="text-xs text-muted-foreground">Tazama bidhaa</div>
            </div>
          </Link>
        )}
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-background">
        {/* Inquiry summary (if exists) */}
        {inquiry && (
          <div className="rounded-md border p-3 bg-muted/40 text-sm">
            <div className="font-medium mb-1">Muhtasari wa Ombi</div>
            <div className="flex flex-wrap gap-2">
              {inquiry.quantity != null && (
                <Badge variant="secondary">
                  QTY: {inquiry.quantity} {inquiry.unit || ""}
                </Badge>
              )}
              {inquiry.variant && (
                <Badge variant="secondary">Aina: {inquiry.variant}</Badge>
              )}
              {inquiry.targetPrice && (
                <Badge variant="secondary">
                  Bei lengwa: {inquiry.targetPrice}
                </Badge>
              )}
              {inquiry.customization && (
                <Badge variant="secondary">Customization: Ndiyo</Badge>
              )}
              {inquiry.needSamples && (
                <Badge variant="secondary">Sampuli: Ndio</Badge>
              )}
              {inquiry.shippingTerm && (
                <Badge variant="secondary">
                  Usafiri: {inquiry.shippingTerm}
                </Badge>
              )}
              <Badge>{inquiry.status}</Badge>
            </div>
            {inquiry.notes && (
              <div className="mt-2 text-muted-foreground">{inquiry.notes}</div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                  mine
                    ? "bg-green-600 text-white"
                    : m.moderated
                      ? "bg-yellow-100 border border-blue-300 text-foreground" // moderated style
                      : "bg-muted"
                }`}
              >
                {/* reply-to preview */}
                {m.replyTo && (
                  <div className="mb-1 rounded-md bg-black/10 px-2 py-1 text-xs italic">
                    <span className="font-semibold">
                      {m.replyTo.sender?.name || "Mjumbe"}
                    </span>
                    : {m.replyTo.content.slice(0, 60)}
                    {m.replyTo.content.length > 60 && "..."}
                  </div>
                )}

                {/* body */}
                <div className="whitespace-pre-wrap ">
                  {m.content}
                  {m.moderated && (
                    <div className="mt-1 text-[11px] text-blue-600 italic">
                      Ujumbe umebadilishwa kwa usalama na maadili.
                    </div>
                  )}
                </div>
                {/* attachments */}
                {m.attachments?.length ? (
                  <div className="mt-2 space-y-1">
                    {m.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`${mine ? "text-white/90 underline" : "text-primary underline"} text-xs`}
                      >
                        📎 {att.name || "Kiambatisho"}
                      </a>
                    ))}
                  </div>
                ) : null}
                {/* product mention */}
                {(m as any).product && (
                  <Link
                    href={`/product/${(m as any).product.slug}`}
                    className="mt-2 block rounded-md border bg-white overflow-hidden"
                  >
                    <div className="flex items-center gap-2 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={(m as any).product.images?.[0]}
                        alt={(m as any).product.name}
                        className="h-12 w-12 object-cover rounded"
                      />
                      <div className="flex-1 text-xs">
                        <div className="font-medium line-clamp-1">
                          {(m as any).product.name}
                        </div>
                        <div className="text-muted-foreground">
                          {`$${(m as any).product.price}`}
                        </div>
                      </div>
                    </div>
                  </Link>
                )}

                {/* meta */}
                <div
                  className={`mt-1 flex items-center gap-2 text-[10px] opacity-80 ${mine ? "text-white" : "text-foreground/70"}`}
                >
                  <span>{new Date(m.sentAt).toLocaleTimeString()}</span>
                  {mine && (
                    <span>{m.isRead ? "✔✔ Imeonekana" : "✔ Imetumwa"}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t p-3 space-y-2">
        {/* Uploads row */}
        <div className="flex items-center gap-2">
          <UploadButton
            endpoint="quoteAttachment"
            appearance={{
              button:
                "bg-green-600 text-white hover:bg-green-700 px-3 py-1 rounded-md",
              label: "text-green-700",
            }}
            onUploadBegin={() => setUploadingCount((c) => c + 1)}
            onUploadError={() => setUploadingCount((c) => Math.max(0, c - 1))}
            onClientUploadComplete={(res) => {
              // res: Array<{ url, name?, ... }>
              const files = res.map((r: any) => ({
                url: r.url as string,
                name: r.name as string | undefined,
              }));
              setAttachments((prev) => [...prev, ...files]);
              setUploadingCount((c) => Math.max(0, c - 1));
            }}
            content={{ button: "Ambatisha hati (PDF, n.k.)" }}
          />
          {uploadingCount > 0 && (
            <span className="text-xs text-green-600">Inapakia…</span>
          )}
          {!!attachments.length && (
            <div className="flex flex-wrap gap-2 text-xs">
              {attachments.map((f, i) => (
                <span key={i} className="px-2 py-1 bg-muted rounded-full">
                  📎 {f.name || "Faili"}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {/* show a “Replying to …” bar above the textarea when replyTo is set */}
          {replyTo && (
            <div className="border-l-4 border-green-600 bg-muted/30 p-2 mb-2 text-sm relative">
              <div className="font-medium">Replying to:</div>
              <div className="line-clamp-1 text-muted-foreground">
                {replyTo.content}
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="absolute top-1 right-1 text-xs text-red-500"
              >
                ×
              </button>
            </div>
          )}

          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Andika ujumbe wako (hakikisha hauna mawasiliano binafsi)…"
            className="min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button
            onClick={send}
            disabled={!value.trim() && attachments.length === 0}
          >
            Tuma
          </Button>
        </div>

        <div className="text-[11px] text-muted-foreground">
          ⚠️ Tafadhali **usishiriki** namba ya simu, barua pepe au mawasiliano
          binafsi. Mfumo utachuja taarifa hizo kwa usalama.
        </div>
      </div>
    </div>
  );
}
