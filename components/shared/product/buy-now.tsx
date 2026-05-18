"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import { CartItem } from "@/types";

const BuyNow = ({ item }: { item: CartItem & { qty?: number } }) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const qty = item.qty ?? 1;

  const handleBuyNow = () => {
    startTransition(() => {
      const url = `/place-order2?buyNow=1&productId=${encodeURIComponent(
        item.productId
      )}&qty=${encodeURIComponent(String(qty))}`;
      router.push(url);
    });
  };

  return (
    <Button
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
      type="button"
      onClick={handleBuyNow}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Zap className="w-3.5 h-3.5 fill-white" />
      )}
      Nunua Sasa
    </Button>
  );
};

export default BuyNow;
