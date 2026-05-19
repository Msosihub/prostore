"use client";

import { Cart, CartItem } from "@/types";
import { Button } from "@/components/ui/button";
import { addItemToCart } from "@/lib/actions/cart.actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ShoppingBag, Loader2 } from "lucide-react";
import { useTransition } from "react";

interface AddToCartProps {
  cart?: Cart;
  item: CartItem;
  currentQty: number; // 🟢 Driven dynamically by unified client selector state
}

const AddToCart = ({ item, currentQty }: AddToCartProps) => {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  //console.log("Cart: ", cart);

  const handleAddToCart = async () => {
    startTransition(async () => {
      // Package item payload payload with matching dynamic tier numbers overrides
      const res = await addItemToCart({
        ...item,
        qty: currentQty,
      });

      if (!res.success) {
        toast({ variant: "destructive", description: res.message as string });
        return;
      }

      toast({
        title: "Umefanikiwa!",
        description: "Bidhaa imewekwa kwenye kikapu chako.",
        action: (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs bg-white text-slate-800 border-slate-200"
            onClick={() => router.push("/cart")}
          >
            Angalia Kikapu
          </Button>
        ),
      });
    });
  };

  return (
    <Button
      className="w-full h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
      type="button"
      onClick={handleAddToCart}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <ShoppingBag className="w-3.5 h-3.5" />
      )}
      Weka Kikapuni
    </Button>
  );
};

export default AddToCart;
