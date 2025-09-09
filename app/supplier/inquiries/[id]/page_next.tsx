// // app/supplier/inquiries/[id]/page.tsx
// "use client";

// import { useParams } from "next/navigation";
// import { useEffect, useState } from "react";
// import { Card, CardHeader, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { useToast } from "@/hooks/use-toast";
// import { Inquiry } from "@/types";

// export default function InquiryDetailPage() {
//   const { toast } = useToast();
//   const { id } = useParams();
//   const [inquiry, setInquiry] = useState<Inquiry>();
//   const [quote, setQuote] = useState({
//     pricePerUnit: "",
//     moq: "",
//     leadTime: "",
//     validity: "",
//     notes: "",
//   });

//   useEffect(() => {
//     // Fetch inquiry details
//     fetch(`/api/inquiries/${id}`)
//       .then((res) => res.json())
//       .then(setInquiry);
//   }, [id]);

//   const handleSubmit = async () => {
//     const res = await fetch("/api/quotes", {
//       headers: { "Content-Type": "application/json" },
//       method: "POST",
//       body: JSON.stringify({ inquiryId: id, ...quote }),
//     });

//     if (res.ok) {
//       //("Quote sent successfully");
//       toast({
//         description: "Your quote has been sent to the buyer.",
//       });
//     } else {
//       //("Failed to send quote");
//       toast({
//         variant: "destructive",
//         description: "Failed to send quote",
//       });
//     }
//   };

//   if (!inquiry) return <p>Loading...</p>;

//   return (
//     <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
//       <Card>
//         <CardHeader>
//           <h2 className="text-xl font-semibold">Inquiry Details</h2>
//         </CardHeader>
//         <CardContent className="space-y-2 text-sm">
//           <p>
//             <strong>Product:</strong> {inquiry.product?.name}
//           </p>
//           <p>
//             <strong>Quantity:</strong> {inquiry.quantity} {inquiry.unit}
//           </p>
//           <p>
//             <strong>Variant:</strong> {inquiry.variant}
//           </p>
//           <p>
//             <strong>Target Price:</strong> ${inquiry.targetPrice}
//           </p>
//           <p>
//             <strong>Customization:</strong>{" "}
//             {inquiry.customization ? "Yes" : "No"}
//           </p>
//           <p>
//             <strong>Shipping Term:</strong> {inquiry.shippingTerm}
//           </p>
//           <p>
//             <strong>Needs Samples:</strong> {inquiry.needSamples ? "Yes" : "No"}
//           </p>
//           <p>
//             <strong>Notes:</strong> {inquiry.notes}
//           </p>
//           <Badge variant="outline">{inquiry.status}</Badge>
//         </CardContent>
//       </Card>

//       <Card>
//         <CardHeader>
//           <h2 className="text-xl font-semibold">Send Quote</h2>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <Input
//             placeholder="Price per unit"
//             value={quote.pricePerUnit}
//             onChange={(e) =>
//               setQuote({ ...quote, pricePerUnit: e.target.value })
//             }
//           />
//           <Input
//             placeholder="Minimum Order Quantity"
//             value={quote.moq}
//             onChange={(e) => setQuote({ ...quote, moq: e.target.value })}
//           />
//           <Input
//             placeholder="Lead time (e.g. 7 days)"
//             value={quote.leadTime}
//             onChange={(e) => setQuote({ ...quote, leadTime: e.target.value })}
//           />
//           <Input
//             placeholder="Validity period (e.g. 30 days)"
//             value={quote.validity}
//             onChange={(e) => setQuote({ ...quote, validity: e.target.value })}
//           />
//           <Textarea
//             placeholder="Additional notes"
//             value={quote.notes}
//             onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
//           />
//           <Button onClick={handleSubmit}>Send Quote</Button>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
