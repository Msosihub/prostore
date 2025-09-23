"use client";

import { Button } from "@/components/ui/button";
import { Check, Loader } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
      className="w-full bg-green-600"
      type="button"
      onClick={handleBuyNow}
      disabled={isPending}
    >
      {isPending ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : (
        <Check className="w-4 h-4" />
      )}{" "}
      Nunua Sasa
    </Button>
  );
};

export default BuyNow;
