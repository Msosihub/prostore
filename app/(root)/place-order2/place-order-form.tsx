"use client";

import { useRouter } from "next/navigation";
import { Check, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
import { createBuyNowOrder } from "@/lib/actions/order.actions";

interface PlaceOrderFormProps {
  isBuyNow?: boolean;
  productId?: string | undefined | null;
  qty?: number;
}

const PlaceOrderForm = ({ isBuyNow, productId, qty }: PlaceOrderFormProps) => {
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isBuyNow || !productId) {
      // defensive: shouldn't happen on buy-now page
      console.error("PlaceOrderForm: missing productId or not buy-now");
      return;
    }

    const res = await createBuyNowOrder({
      productId,
      qty: qty ?? 1,
    });

    if (res?.redirectTo) {
      router.push(res.redirectTo);
    } else {
      // show a toast or console.error if you have UI hooks
      console.error("Order failed", res);
    }
  };

  const PlaceOrderButton = () => {
    const { pending } = useFormStatus();
    return (
      <Button disabled={pending} className="w-full bg-green-600" type="submit">
        {pending ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}{" "}
        Place Order
      </Button>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <PlaceOrderButton />
    </form>
  );
};

export default PlaceOrderForm;
