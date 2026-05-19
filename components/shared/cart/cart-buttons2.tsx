"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addItemToCart, removeItemFromCart } from "@/lib/actions/cart.actions";
import { CartItem } from "@/types";
import { Loader2, Plus, Minus } from "lucide-react";

interface CartButtonProps {
  item: CartItem;
}

// 🟢 FIXED: Named exactly as IncrementButton to match your CartTable imports perfectly
export function IncrementButton({ item }: CartButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
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
          const res = await addItemToCart(item);
          if (!res.success) {
            toast({
              variant: "destructive",
              description: String(res.message),
            });
          } else {
            router.refresh(); // Tells Next.js to re-render data layout changes instantly
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
}

// 🟢 FIXED: Named exactly as DecrementButton to match your CartTable imports perfectly
export function DecrementButton({ item }: CartButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
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
              description: String(res.message),
            });
          } else {
            router.refresh(); // Tells Next.js to re-render data layout changes instantly
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
}
