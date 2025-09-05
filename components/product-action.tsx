"use client";

import { useState } from "react";
import { InquiryFormModal } from "@/components/chat/inquiryFormModal";
import BottomToolbar from "@/components/shared/dialogs/bottom-toolbar";

type Props = {
  buyerId: string;
  supplierId: string;
  productId: string;
  supplierUserId: string;
};

export default function ProductClientActions({
  buyerId,
  supplierId,
  productId,
  supplierUserId,
}: Props) {
  const [open, setOpen] = useState(false);

  // console.log("ProductId Received to Buttons", productId);

  return (
    <>
      {buyerId && (
        <InquiryFormModal
          open={open}
          onOpenChange={setOpen}
          buyerId={buyerId}
          supplierId={supplierId}
          supplierUserId={supplierUserId}
          productId={productId}
        />
      )}

      <BottomToolbar
        productId={productId}
        supplierId={supplierId}
        userId={buyerId}
        supplierUserId={supplierUserId}
        openInquiryClick={() => setOpen(true)} // optional button trigger
      />
    </>
  );
}
