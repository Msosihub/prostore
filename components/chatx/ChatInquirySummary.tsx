"use client";

//Inquiry Summary

import { Badge } from "@/components/ui/badge";
import type { InquiryLite } from "./types";

export default function ChatInquirySummary({
  inquiry,
}: {
  inquiry: InquiryLite;
}) {
  return (
    <div className="mx-3 mt-3 rounded-md border p-3 bg-muted/40 text-sm">
      <div className="font-medium mb-1">Inquiry Summary</div>
      <div className="flex flex-wrap gap-2">
        {inquiry.quantity != null && (
          <Badge variant="secondary">
            QTY: {inquiry.quantity} {inquiry.unit || ""}
          </Badge>
        )}
        {inquiry.variant && (
          <Badge variant="secondary">Variant: {inquiry.variant}</Badge>
        )}
        {inquiry.targetPrice && (
          <Badge variant="secondary">Target: {inquiry.targetPrice}</Badge>
        )}
        {inquiry.customization && (
          <Badge variant="secondary">Customization: Yes</Badge>
        )}
        {inquiry.needSamples && <Badge variant="secondary">Samples: Yes</Badge>}
        {inquiry.shippingTerm && (
          <Badge variant="secondary">Shipping: {inquiry.shippingTerm}</Badge>
        )}
        <Badge>{inquiry.status}</Badge>
      </div>
      {inquiry.notes && (
        <div className="mt-2 text-muted-foreground">{inquiry.notes}</div>
      )}
    </div>
  );
}
