"use client";

import { Loader, ShoppingCart, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BuyNow from "../product/buy-now";
import { CartItem } from "@/types";

export default function BottomToolbar({
  productId,
  supplierId,
  supplierUserId,
  userId,
  item,
  cartCount = 0,
}: {
  productId: string;
  supplierId: string;
  supplierUserId: string;
  userId: string;
  item: CartItem;
  cartCount?: number;
}) {
  const router = useRouter();
  const [isPressed, setIsPressed] = useState(false);

  async function startChat() {
    if (!userId) {
      router.push(
        `/sign-in?callbackUrl=/product/${productId}&showToastFlag=true`
      );
      return;
    }
    if (userId === supplierUserId) {
      toast({
        title: "Hairuhusiwi!",
        description: "Wewe ndio muuzaji wa bidhaa hii. 😀",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPressed(true);
      const res = await fetch("/api/conversations/chat-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: userId,
          supplierId,
          productId,
          supplierUserId,
        }),
      });

      const data = await res.json();
      const conversation = data.conversation;

      if (res.ok && conversation) {
        sessionStorage.setItem(
          `conversation:${conversation.id}`,
          JSON.stringify(conversation)
        );
        router.push(`/chat/${conversation.id}`);
      } else {
        throw new Error("Failed to init chat");
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Hitilafu!",
        description: "Imeshindikana kuanzisha chati, tafadhali jaribu tena.",
        variant: "destructive",
      });
    } finally {
      setIsPressed(false);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.05)] pb-safe">
      <div className="mx-auto flex max-w-5xl items-center px-4 py-3 gap-4 justify-between">
        {/* Left Action Anchor: Quick Basket Route */}
        {/* Left Action Anchor: Quick Basket Route featuring interactive Badge counts */}
        <button
          disabled={isPressed}
          onClick={() => router.push("/cart")}
          className="relative flex flex-col items-center justify-center text-[10px] font-medium text-slate-500 hover:text-slate-800 transition-colors shrink-0 px-2 group"
        >
          <div className="relative p-0.5">
            <ShoppingCart className="h-5.5 w-5.5 text-slate-600 group-hover:text-slate-900 transition-colors stroke-[2]" />

            {/* 🟢 CAR DELIVERED COUNT BADGE BUBBLE UI LAYER */}
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white animate-in zoom-in-50 duration-200">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </div>
          <span className="mt-0.5">Mizigo</span>
        </button>

        {/* Right Actions Block: Unified dynamic actions bar */}
        <div className="flex flex-1 items-center gap-2 max-w-md ml-auto">
          {/* Buy Now Primary Trigger Component Node */}
          <div className="flex-1 transform scale-95 origin-right">
            <BuyNow
              item={{
                productId: productId,
                name: item?.name,
                price: item?.price,
                priceTiers: item.priceTiers,
                qty: 1,
                image: item?.image || "",
              }}
            />
          </div>

          {/* 🟢 FIXED: Removed disabled={true} restriction and aligned to consistent premium styling parameters */}
          <Button
            disabled={true}
            //disabled={isPressed}
            className="text-xs font-bold flex-1 h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-1.5 shadow-sm transform scale-95 origin-right"
            onClick={startChat}
          >
            {isPressed ? (
              <Loader className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MessageSquareText className="w-3.5 h-3.5" />
            )}
            {isPressed ? "Inaanza..." : "Chati na Muuzaji"}
          </Button>
        </div>
      </div>
    </div>
  );
}
