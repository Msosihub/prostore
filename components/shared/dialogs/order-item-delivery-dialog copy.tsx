// "use client";

// import { useState, useTransition } from "react";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Textarea } from "@/components/ui/textarea";
// import { Button } from "@/components/ui/button";
// import { Star, Loader2, PackageCheck } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { confirmOrderItemDeliveryWithFeedback } from "@/lib/actions/order.actions";

// export default function OrderItemDeliveryConfirmDialog({
//   open,
//   onOpenChange,
//   orderId,
//   productId,
//   itemName,
//   onSuccess,
// }: {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   orderId: string;
//   productId: string;
//   itemName: string;
//   onSuccess?: () => void;
// }) {
//   const [rating, setRating] = useState(0);
//   const [comment, setComment] = useState("");
//   const [isPending, startTransition] = useTransition();

//   const submit = () => {
//     if (rating === 0) {
//       alert("Tafadhali chagua nyota kwanza.");
//       return;
//     }

//     startTransition(async () => {
//       const res = await confirmOrderItemDeliveryWithFeedback({
//         orderId,
//         productId,
//         rating,
//         comment,
//       });

//       if (res.success) {
//         alert(res.message);
//         //onOpenChange(false);
//         onSuccess?.();
//       } else {
//         alert(res.message);
//       }
//     });
//   };

//   return (
//     <Dialog open={open} onOpenChange={isPending ? () => {} : onOpenChange}>
//       <DialogContent className="w-[94%] max-w-[420px] rounded-2xl p-4 bg-white">
//         <DialogHeader className="text-left border-b border-slate-100 pb-3">
//           <DialogTitle className="text-base font-bold flex items-center gap-1.5">
//             <PackageCheck className="w-4 h-4 text-emerald-600" />
//             Thibitisha Kupokea Bidhaa
//           </DialogTitle>
//           <DialogDescription className="text-xs text-slate-500">
//             Uthibitisho huu utaruhusu malipo ya supplier kutolewa kutoka escrow.
//           </DialogDescription>
//         </DialogHeader>

//         <div className="pt-4 space-y-4">
//           <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
//             <p className="text-xs text-slate-400 font-bold uppercase">Bidhaa</p>
//             <p className="text-sm font-bold text-slate-900">{itemName}</p>
//           </div>

//           <div>
//             <label className="text-xs font-semibold text-slate-700">
//               Ubora wa bidhaa / huduma *
//             </label>
//             <div className="flex gap-1.5 pt-1">
//               {[1, 2, 3, 4, 5].map((star) => (
//                 <button
//                   key={star}
//                   type="button"
//                   onClick={() => setRating(star)}
//                   className="p-0.5"
//                 >
//                   <Star
//                     className={cn(
//                       "w-7 h-7",
//                       star <= rating
//                         ? "text-amber-500 fill-amber-500"
//                         : "text-slate-200",
//                     )}
//                   />
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div>
//             <div className="flex justify-between">
//               <label className="text-xs font-semibold text-slate-700">
//                 Maoni kuhusu delivery / supplier
//               </label>
//               <span className="text-[10px] text-slate-400">
//                 {comment.length}/180
//               </span>
//             </div>
//             <Textarea
//               value={comment}
//               onChange={(e) => setComment(e.target.value.slice(0, 180))}
//               placeholder="Mfano: Bidhaa imefika salama, packaging nzuri..."
//               className="mt-1 min-h-[80px] text-xs rounded-xl resize-none"
//               disabled={isPending}
//             />
//           </div>
//         </div>

//         <DialogFooter className="pt-4">
//           <Button
//             onClick={submit}
//             disabled={isPending}
//             className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
//           >
//             {isPending ? (
//               <>
//                 <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
//                 Inathibitisha...
//               </>
//             ) : (
//               "Nimepokea Salama"
//             )}
//           </Button>

//           <Button
//             type="button"
//             variant="outline"
//             disabled={isPending}
//             className="w-full h-10 rounded-xl text-xs font-bold border-rose-200 text-rose-700"
//             onClick={() => setProblemMode(true)}
//           >
//             Nina tatizo na bidhaa hii
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }
