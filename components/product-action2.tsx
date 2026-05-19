"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Minus,
  MessageSquareText,
  Zap,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Cart, CartItem } from "@/types";
import { Decimal } from "@prisma/client/runtime/library";
import { formatCurrency } from "@/lib/utils";
import PricingTable from "./shared/product/pricing-table";
import AddToCart from "./shared/product/add-to-cart";

interface ProductClientActionsProps {
  buyerId: string;
  supplierId: string;
  productId: string;
  supplierUserId: string;
  item: CartItem;
  cartData?: Cart;
  pricingTiers?: { id: string; minQty: number; price: Decimal }[];
  fallbackPrice: number;
  stock: number;
}

export default function ProductClientActions({
  buyerId,
  supplierId,
  productId,
  supplierUserId,
  item,
  cartData,
  pricingTiers = [],
  fallbackPrice,
  stock,
}: ProductClientActionsProps) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [isChatPending, setIsChatPending] = useState(false);
  const [isBuyPending, startBuyTransition] = useTransition();

  const getLiveUnitPrice = () => {
    const sorted = [...pricingTiers].sort((a, b) => b.minQty - a.minQty);
    const matchedTier = sorted.find((tier) => qty >= tier.minQty);
    return matchedTier ? Number(matchedTier.price) : fallbackPrice;
  };

  const currentUnitPrice = getLiveUnitPrice();
  const currentTotalPrice = currentUnitPrice * qty;

  const handleIncrement = () => {
    if (qty >= stock) {
      toast({
        description: `Samahani, kiwango cha mwisho cha mzigo uliopo ni ${stock}`,
        variant: "destructive",
      });
      return;
    }
    setQty((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setQty((prev) => Math.max(1, prev - 1));
  };

  async function handleStartChat() {
    if (!buyerId) {
      router.push(
        `/sign-in?callbackUrl=/product/${productId}&showToastFlag=true`
      );
      return;
    }
    if (buyerId === supplierUserId) {
      toast({
        title: "Hairuhusiwi!",
        description: "Wewe ndio muuzaji wa bidhaa hii. 😀",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsChatPending(true);
      const res = await fetch("/api/conversations/chat-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId,
          supplierId,
          productId,
          supplierUserId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.conversation) {
        router.push(`/chat/${data.conversation.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatPending(false);
    }
  }

  const handleBuyNowExecution = () => {
    startBuyTransition(() => {
      const url = `/place-order2?buyNow=1&productId=${encodeURIComponent(productId)}&qty=${encodeURIComponent(String(qty))}`;
      router.push(url);
    });
  };

  const cartCount = cartData?.items ? cartData.items.length : 0;

  return (
    <div className="w-full space-y-4">
      {/* Dynamic Tier Highlighting Matrix Area */}
      <div className="w-full">
        <PricingTable
          tiers={pricingTiers}
          fallbackPrice={fallbackPrice}
          activeQty={qty}
        />
      </div>

      {/* Inline Desktop Stepper (Hidden on mobile viewports to prevent double layouts) */}
      <div className="hidden md:flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-sm">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Chagua Idadi
        </span>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            disabled={qty <= 1}
            className="h-8 w-8 rounded-lg bg-white border-slate-200 text-slate-700"
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <span className="text-sm font-bold text-slate-800 min-w-[20px] text-center">
            {qty}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleIncrement}
            disabled={qty >= stock}
            className="h-8 w-8 rounded-lg bg-white border-slate-200 text-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 📱 DUAL-ROW MOBILE & WEB UNIFIED BOTTOM TOOLBAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-safe">
        <div className="mx-auto flex flex-col max-w-lg md:max-w-5xl px-4 py-2.5 gap-2.5">
          {/* 🟢 ROW 1 (Mobile Focused): Price Breakdowns + Interactive Stepper Controls */}
          <div className="flex items-center justify-between md:hidden border-b border-slate-50 pb-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Jumla ya Malipo ({qty} pcs)
              </span>
              <span className="text-base font-extrabold text-green-700 tracking-tight">
                {formatCurrency(currentTotalPrice)}
              </span>
            </div>

            {/* Mobile Native Fluid Inline Stepper */}
            <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-100/50">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={qty <= 1}
                className="h-7 w-7 rounded-md bg-white border border-slate-200 flex items-center justify-center disabled:opacity-50"
              >
                <Minus className="w-3 h-3 text-slate-600" />
              </button>
              <span className="text-xs font-bold text-slate-800 min-w-[28px] text-center">
                {qty}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={qty >= stock}
                className="h-7 w-7 rounded-md bg-white border border-slate-200 flex items-center justify-center disabled:opacity-50"
              >
                <Plus className="w-3 h-3 text-slate-600" />
              </button>
            </div>
          </div>

          {/* 🟢 ROW 2: Primary Conversions Navigation Layer Controls */}
          <div className="flex items-center gap-3 w-full">
            {/* Desktop-only Price View Indicator Column */}
            <div className="hidden md:flex flex-col shrink-0 min-w-[120px]">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Jumla Kuu ({qty} pcs)
              </span>
              <span className="text-base font-extrabold text-green-700 tracking-tight">
                {formatCurrency(currentTotalPrice)}
              </span>
            </div>

            {/* Quick Actions Panel: Basket Route + Chat Trigger */}
            <div className="flex items-center gap-4 shrink-0 pr-1 border-r border-slate-100">
              {/* Basket Icon Link Anchor */}
              <button
                type="button"
                onClick={() => router.push("/cart")}
                className="relative flex flex-col items-center justify-center text-[9px] font-medium text-slate-500 hover:text-slate-800 transition-colors px-1"
              >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5 text-slate-600" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-white">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="mt-0.5">Mizigo</span>
              </button>

              {/* Mobile Chat Button Trigger Context */}
              <button
                disabled={isChatPending}
                onClick={handleStartChat}
                className="flex hidden flex-col items-center justify-center text-[9px] font-medium text-slate-500 hover:text-slate-800 transition-colors px-1 disabled:opacity-50"
              >
                {isChatPending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  <MessageSquareText className="h-5 w-5 text-slate-600" />
                )}
                <span className="mt-0.5">Chati</span>
              </button>
            </div>

            {/* Primary Action Button Pair Triggers */}
            <div className="flex flex-1 items-center gap-2">
              <div className="flex-1">
                <AddToCart cart={cartData} item={item} currentQty={qty} />
              </div>
              <Button
                onClick={handleBuyNowExecution}
                disabled={isBuyPending}
                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm rounded-xl"
              >
                {isBuyPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 fill-white" />
                )}
                Nunua Sasa
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
