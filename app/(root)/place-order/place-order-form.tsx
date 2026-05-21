"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import PaymentLoadingScreen from "@/components/payment-loading-screen";
import { createOrder } from "@/lib/actions/order.actions";

export default function PlaceOrderForm() {
  const router = useRouter();
  const [paymentStage, setPaymentStage] = useState<
    "idle" | "creating" | "push_sent" | "completed"
  >("idle");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      // 1. Database Creation Layer triggered
      setPaymentStage("creating");
      const res = await createOrder();

      if (!res.success && res.redirectTo) {
        setPaymentStage("idle");
        router.push(res.redirectTo);
        return;
      }

      if (!res.success || !res.orderData) {
        console.error("Order creation failed", res);
        alert(res?.message || "Imeshindikana kuunda agizo.");
        setPaymentStage("idle");
        return;
      }

      const orderId = res.orderData.id;

      // 2. Database complete, fire Zenopay push request layer
      const payResponse = await fetch("/api/zenopay/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId }),
      });

      const paymentData = await payResponse.json();

      if (paymentData.success) {
        // Shift UI to prompt mode
        setPaymentStage("push_sent");

        // Wait 6 seconds to let the user see the visual overlay / input their pin
        await new Promise((resolve) => setTimeout(resolve, 6000));

        // Final success state transition before shifting routes
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
          Agiza Sasa
        </Button>
      </form>
    </>
  );
}
