// components/InquirySheet.tsx
"use client";

import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

type InquiryFormValues = {
  quantity: number;
  unit: string;
  variant?: string;
  targetPrice?: number;
  customization?: boolean;
  shippingTerm?: string;
  needSamples?: boolean;
  notes?: string;
};

export function InquirySheet({ conversationId }: { conversationId: string }) {
  const { toast } = useToast();
  const { register, handleSubmit, reset } = useForm<InquiryFormValues>();
  const router = useRouter();

  const onSubmit = async (data: InquiryFormValues) => {
    try {
      await fetch("/api/inquiries", {
        method: "POST",
        body: JSON.stringify({ conversationId, ...data }),
        headers: { "Content-Type": "application/json" },
      });

      // Optional: auto-send summary message
      await fetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          conversationId,
          body: `📦 Inquiry submitted:\n- Quantity: ${data.quantity} ${data.unit}\n- Variant: ${data.variant}\n- Target Price: ${data.targetPrice}\n- Customization: ${data.customization ? "Yes" : "No"}\n- Shipping Term: ${data.shippingTerm}\n- Samples: ${data.needSamples ? "Yes" : "No"}\n- Notes: ${data.notes}`,
        }),
        headers: { "Content-Type": "application/json" },
      });

      //toast.success("Inquiry sent successfully");
      toast({
        description: "Your inquiry has been submitted.",
      });
      reset();
      router.refresh(); // refresh chat page to show badge
    } catch (error) {
      //toast.error("Failed to send inquiry");
      //const description = (error as Error).message;
      toast({
        variant: "destructive",
        description:
          "There was an error submitting your inquiry. Please try again.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>Quantity</label>
        <input type="number" {...register("quantity", { required: true })} />
      </div>
      <div>
        <label>Unit</label>
        <input type="text" {...register("unit", { required: true })} />
      </div>
      <div>
        <label>Variant</label>
        <input type="text" {...register("variant")} />
      </div>
      <div>
        <label>Target Price</label>
        <input type="number" {...register("targetPrice")} />
      </div>
      <div>
        <label>Customization</label>
        <input type="checkbox" {...register("customization")} />
      </div>
      <div>
        <label>Shipping Term</label>
        <input type="text" {...register("shippingTerm")} />
      </div>
      <div>
        <label>Need Samples?</label>
        <input type="checkbox" {...register("needSamples")} />
      </div>
      <div>
        <label>Notes</label>
        <textarea {...register("notes")} />
      </div>
      <button type="submit" className="btn btn-primary">
        Send Inquiry
      </button>
    </form>
  );
}
