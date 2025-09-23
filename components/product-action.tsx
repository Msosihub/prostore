"use client";

// import { useState } from "react";
// import { InquiryFormModal } from "@/components/chat/inquiryFormModal";
import BottomToolbar from "@/components/shared/dialogs/bottom-toolbar";
import { CartItem } from "@/types";

type Props = {
  buyerId: string;
  supplierId: string;
  productId: string;
  supplierUserId: string;
  item: CartItem;
};

export default function ProductClientActions({
  buyerId,
  supplierId,
  productId,
  supplierUserId,
  item,
}: Props) {
  // const [open, setOpen] = useState(false);

  // console.log("ProductId Received to Buttons", productId);

  return (
    <>
      {/* {buyerId && (
        <InquiryFormModal //replace this with bottom drawer
          open={open}
          onOpenChange={setOpen}
          buyerId={buyerId}
          supplierId={supplierId}
          supplierUserId={supplierUserId}
          productId={productId}
        />
      )} */}

      <BottomToolbar
        productId={productId}
        supplierId={supplierId}
        userId={buyerId}
        supplierUserId={supplierUserId}
        item={item}
        // openInquiryClick={() => setOpen(true)} // optional button trigger
      />
    </>
  );
}
