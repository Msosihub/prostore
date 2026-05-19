"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addItemToCart, removeItemFromCart } from "@/lib/actions/cart.actions";
import { CartItem } from "@/types";
import { Loader2, Plus, Minus } from "lucide-react";

interface CartButtonProps {
  item: CartItem;
}

const IncrementButton = ({ item }: CartButtonProps) => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={isPending}
      variant="outline"
      size="icon"
      className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all shadow-sm shrink-0"
      onClick={() =>
        startTransition(async () => {
          // Passes data down to your upgraded server action checking dynamic wholesale tiers
          const res = await addItemToCart(item);
          if (!res.success) {
            toast({
              variant: "destructive",
              description: res.message as string,
            });
          }
        })
      }
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
      ) : (
        <Plus className="w-3.5 h-3.5" />
      )}
    </Button>
  );
};

const DecrementButton = ({ item }: CartButtonProps) => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={isPending}
      variant="outline"
      size="icon"
      className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 transition-all shadow-sm shrink-0"
      onClick={() =>
        startTransition(async () => {
          const res = await removeItemFromCart(item.productId);
          if (!res.success) {
            toast({
              variant: "destructive",
              description: res.message as string,
            });
          }
        })
      }
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
      ) : (
        <Minus className="w-3.5 h-3.5" />
      )}
    </Button>
  );
};

export { IncrementButton, DecrementButton };
