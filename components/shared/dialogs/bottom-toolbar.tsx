"use client";

import { Loader, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BuyNow from "../product/buy-now";
import { CartItem } from "@/types";
// import { auth } from "@/auth";

export default function BottomToolbar({
  productId,
  supplierId,
  supplierUserId,
  userId,
  item,
  // openInquiryClick,
}: {
  productId: string;
  supplierId: string;
  supplierUserId: string;
  userId: string;
  item: CartItem;
  // openInquiryClick?: () => void;
}) {
  const router = useRouter();
  const [isPressed, setIsPressed] = useState(false);
  // const [inquiryPressed, setInquiryPressed] = useState(false);

  async function startChat() {
    setIsPressed(true);
    if (!userId) {
      //redirect to sign-in page with callbackUrl and showToastFlag
      const id = productId;
      router.push(`/sign-in?callbackUrl=/product/${id}&showToastFlag=true`);
      setIsPressed(false);
      return;
    }
    if (userId === supplierUserId) {
      setIsPressed(true);
      toast({
        title: "Hairuhusiwi!",
        description: "Wewe ndio muuzaji wa bidhaa hii.😀",
        variant: "destructive",
      });
      setIsPressed(false);
      return;
    }
    const buyerId = userId;

    setIsPressed(true);
    const res = await fetch("/api/conversations/chat-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerId, supplierId, productId, supplierUserId }),
    });
    const { conversation } = await res.json();
    if (res.ok) {
      // Store in state or a query cache (Zustand, React Query, etc.)
      // sessionStorage.setItem("chatInit", JSON.stringify(conversation));
      sessionStorage.setItem(
        `conversation:${conversation.id}`,
        JSON.stringify(conversation)
      );
      router.push(`/chat/${conversation.id}`);
      setIsPressed(false);
      // redirect to UI page (not API)
      // window.location.href = `/chat/${conversation.id}`;
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-md">
      <div className="mx-auto flex max-w-4xl items-center  px-4 py-2 gap-3 md:justify-between">
        {/* Left: Small Cart/Store Button */}
        <button
          disabled={isPressed}
          onClick={() => {
            router.push("/cart");
          }}
          className="flex flex-col items-center justify-center text-xs text-muted-foreground"
        >
          <ShoppingCart className="text-[11px] md:text-base h-6 w-6 mb-1 text-gray-700" />
          <span>Mizigo yako</span>
        </button>

        {/* Right: Two Action Buttons */}
        <div className="flex flex-1 gap-2">
          {/* <Button
            disabled={isPressed || inquiryPressed}
            variant="outline"
            className="flex-1 rounded-full px-6 py-2 text-sm"
            onClick={() => {
              setInquiryPressed(true);
              if (userId === supplierUserId) {
                toast({
                  title: "Hairuhusiwi!",
                  description: "Wewe ndio muuzaji wa bidhaa hii.😀",
                  variant: "destructive",
                });
                setInquiryPressed(false);
                return;
              }
              openInquiryClick?.();
              setInquiryPressed(false);
            }}
          >
            {inquiryPressed && <Loader className="w-4 h-4 animate-spin" />}
            {inquiryPressed ? "Inaanza..." : "Nunua sasa"}
          </Button> */}
          <BuyNow
            item={{
              productId: productId,
              name: item?.name,
              price: item?.price,
              qty: 1,
              image: "",
            }}
          />
          <Button
            disabled={isPressed}
            className=" text-xs flex-1 rounded-full px-6 py-2 md:text-sm bg-orange-500"
            onClick={startChat}
          >
            {isPressed && <Loader className="w-4 h-4 animate-spin" />}
            {isPressed ? "Inaanza..." : "Chati na Muuzaji"}
          </Button>
        </div>
      </div>
    </div>
  );
}
