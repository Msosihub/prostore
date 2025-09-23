// "use client";

// import { useRouter } from "next/navigation";
// import { Check, Loader } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useFormStatus } from "react-dom";
// import { createBuyNowOrder } from "@/lib/actions/order.actions";

// // types for props
// interface PlaceOrderFormProps {
//   isBuyNow?: boolean;
//   productId?: string;
//   qty?: number;
// }

// const PlaceOrderForm = ({ isBuyNow, productId, qty }: PlaceOrderFormProps) => {
//   const router = useRouter();

//   const handleSubmit = async (event: React.FormEvent) => {
//     event.preventDefault();

//     const res = await createBuyNowOrder({
//       isBuyNow: Boolean(isBuyNow),
//       productId,
//       qty: qty ?? 1,
//     });

//     if (res.redirectTo) {
//       router.push(res.redirectTo);
//     }
//   };

//   const PlaceOrderButton = () => {
//     const { pending } = useFormStatus();
//     return (
//       <Button disabled={pending} className="w-full bg-green-600">
//         {pending ? (
//           <Loader className="w-4 h-4 animate-spin" />
//         ) : (
//           <Check className="w-4 h-4" />
//         )}{" "}
//         Place Order
//       </Button>
//     );
//   };

//   return (
//     <form onSubmit={handleSubmit} className="w-full">
//       <PlaceOrderButton />
//     </form>
//   );
// };

// export default PlaceOrderForm;
