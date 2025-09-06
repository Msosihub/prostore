// ChatInquirySummary.tsx
import { Badge } from "@/components/ui/badge";
import { CornerUpLeft } from "lucide-react";
import type { InquiryLite, MessageLite } from "./types";
import Link from "next/link";

export default function ChatInquirySummary({
  inquiry,
  pinned,
  onReply,
  message,
}: {
  inquiry: InquiryLite;
  pinned?: boolean;
  onReply?: (m: Partial<MessageLite> & { inquiry: InquiryLite }) => void;
  message?: MessageLite;
}) {
  return (
    <div
      className={`rounded-xl border shadow-sm ${
        pinned ? "bg-white" : "bg-muted/30"
      } p-4 pt-2 text-sm`}
    >
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
      <div className="flex items-center justify-between mb-2 mt-2">
        <span className="font-semibold">
          {pinned ? "📌 Latest Inquiry" : "Inquiry"}
        </span>
        <Badge variant="outline">
          <p className=" text-blue-500">{inquiry.status}</p>
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {inquiry.quantity != null && (
          <div>
            <span className="text-muted-foreground">Quantity:</span>{" "}
            {inquiry.quantity} {inquiry.unit || ""}
          </div>
        )}
        {inquiry.variant && (
          <div>
            <span className="text-muted-foreground">Variant:</span>{" "}
            {inquiry.variant}
          </div>
        )}
        {inquiry.targetPrice && (
          <div>
            <span className="text-muted-foreground">Target Price:</span>
            {inquiry.targetPrice}Tsh
          </div>
        )}
        {inquiry.shippingTerm && (
          <div>
            <span className="text-muted-foreground">Shipping:</span>{" "}
            {inquiry.shippingTerm}
          </div>
        )}
        {inquiry.customization && (
          <div className="col-span-2">⚒️ Customization required</div>
        )}
        {inquiry.needSamples && (
          <div className="col-span-2">📦 Sample requested</div>
        )}
      </div>

      {inquiry.notes && (
        <div className="mt-2 text-muted-foreground italic ">
          “{inquiry.notes}”
        </div>
      )}

      {/* 🔥 Reply action */}
      {onReply && (
        <div className="mt-3 flex justify-end ">
          <button
            onClick={() => {
              if (message) {
                onReply({
                  ...message,
                  inquiry, // 👈 include inquiry here
                  replySourceId: message!.id, // 👈 extra explicit for scroll back
                });
              }
            }}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <CornerUpLeft className="h-3 w-3" />
            <p className="text-[12px] text-blue-500">Reply to Inquiry</p>
          </button>
        </div>
      )}
    </div>
  );
}
