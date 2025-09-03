// "use client";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Label } from "@/components/ui/label";

// const schema = z.object({
//   quantity: z.coerce.number().min(1),
//   unit: z.string().min(1),
//   variant: z.string().optional(),
//   targetPrice: z.coerce.number().optional(),
//   customization: z.boolean().optional(),
//   shippingTerm: z.string().optional(),
//   needSamples: z.boolean().optional(),
//   notes: z.string().optional(),
// });

// export default function InquirySheet({
//   conversationId,
// }: {
//   conversationId: string;
// }) {
//   const {
//     register,
//     handleSubmit,
//     formState: { isSubmitting },
//   } = useForm({ resolver: zodResolver(schema) });

//   async function onSubmit(data: any) {
//     await fetch("/api/inquiries", {
//       method: "POST",
//       body: JSON.stringify({ conversationId, ...data }),
//       headers: { "Content-Type": "application/json" },
//     });
//   }

//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
//       <div className="flex gap-2">
//         <Input {...register("quantity")} placeholder="Quantity" />
//         <Input {...register("unit")} placeholder="Unit (pcs, sets)" />
//       </div>
//       <Input {...register("variant")} placeholder="Variant (color, size)" />
//       <Input {...register("targetPrice")} placeholder="Target Price" />
//       <Input
//         {...register("shippingTerm")}
//         placeholder="Shipping Term (FOB, CIF)"
//       />
//       <div className="flex items-center gap-2">
//         <Checkbox id="customization" {...register("customization")} />
//         <Label htmlFor="customization">Need Customization</Label>
//       </div>
//       <div className="flex items-center gap-2">
//         <Checkbox id="needSamples" {...register("needSamples")} />
//         <Label htmlFor="needSamples">Request Samples</Label>
//       </div>
//       <Textarea {...register("notes")} placeholder="Additional notes..." />
//       <Button type="submit" disabled={isSubmitting}>
//         Send Inquiry
//       </Button>
//     </form>
//   );
// }
