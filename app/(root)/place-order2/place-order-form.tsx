"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createBuyNowOrder } from "@/lib/actions/order.actions";
import PaymentLoadingScreen from "@/components/payment-loading-screen";

interface PlaceOrderFormProps {
  isBuyNow?: boolean;
  productId?: string | undefined | null;
  qty?: number;
}

export default function PlaceOrderForm({
  isBuyNow,
  productId,
  qty,
}: PlaceOrderFormProps) {
  const router = useRouter();
  const [paymentStage, setPaymentStage] = useState<
    "idle" | "creating" | "push_sent" | "completed"
  >("idle");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isBuyNow || !productId) return;

    try {
      setPaymentStage("creating");
      const res = await createBuyNowOrder({
        productId,
        qty: qty ?? 1,
      });

      if (!res?.success || !res.orderData) {
        console.error("Order creation failed", res);
        alert(res?.message || "Imeshindikana kuunda agizo.");
        setPaymentStage("idle");
        return;
      }

      const orderId = res.orderData.id;

      const payResponse = await fetch("/api/zenopay/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId }),
      });

      const paymentData = await payResponse.json();

      if (paymentData.success) {
        setPaymentStage("push_sent");

        // Buffer windows to allow user interaction flow
        await new Promise((resolve) => setTimeout(resolve, 6000));
        setPaymentStage("completed");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        alert("Malipo yameshindikana kuanzishwa, agizo lako limehifadhiwa.");
      }

      router.push("/user/orders");
    } catch (err) {
      console.error("Payment initiation failure:", err);
      alert("Tatizo limetokea wakati wa kuanzisha malipo");
      setPaymentStage("idle");
    }
  };

  return (
    <>
      {paymentStage !== "idle" && <PaymentLoadingScreen stage={paymentStage} />}

      <form onSubmit={handleSubmit} className="w-full">
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-6 text-base"
          type="submit"
        >
          <Check className="w-5 h-5 mr-2" />
          Bonyeza kuagiza
        </Button>
      </form>
    </>
  );
}
