// import { auth } from "@/auth";
// import { getMyCart } from "@/lib/actions/cart.actions";
// import { getUserById } from "@/lib/actions/user.actions";
// import { getProductById } from "@/lib/actions/product.actions";
// import { CartItem, ShippingAddress } from "@/types";
// import { Metadata } from "next";
// import { redirect } from "next/navigation";
// import CheckoutSteps from "@/components/shared/checkup-steps";
// import { Card, CardContent } from "@/components/ui/card";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import Image from "next/image";
// import { formatCurrency } from "@/lib/utils";
// import PlaceOrderForm from "./place-order-form";
// import { JSX } from "react";

// export const dynamic = "force-dynamic";

// export const metadata: Metadata = {
//   title: "Place Order",
// };

// // ----------------- Helpers -----------------
// async function resolveCartData(
//   searchParams: Record<string, string | string[] | undefined>
// ): Promise<{
//   isBuyNow: boolean;
//   cart: {
//     items: (CartItem & { qty: number })[];
//     itemsPrice: string;
//     shippingPrice: string;
//     taxPrice: string;
//     totalPrice: string;
//   };
// }> {
//   if (searchParams.buyNow && typeof searchParams.productId === "string") {
//     const product = await getProductById(searchParams.productId);
//     if (!product) redirect("/not-found");
//     const qty = parseInt(
//       typeof searchParams.qty === "string" ? searchParams.qty : "1",
//       10
//     );
//     let safeCartData;

//     if (product) {
//       const cartItem: CartItem = {
//         productId: product.id,
//         name: product.name,
//         qty,
//         image: product.images?.[0] ?? "", // pick first image
//         price: product.price.toString(), // convert Decimal → string
//         slug: product.slug,
//       };

//       safeCartData = {
//         items: [cartItem],
//         itemsPrice: (Number(product.price) * qty).toString(),
//         shippingPrice: "0",
//         taxPrice: "0",
//         totalPrice: (Number(product.price) * qty).toString(),
//       };
//     }

//     if (!safeCartData) throw new Error("Product not found");

//     return {
//       isBuyNow: true,
//       cart: safeCartData,
//     };
//   }

//   const cartData = await getMyCart();
//   if (!cartData || cartData.items.length === 0) redirect("/cart");

//   return {
//     isBuyNow: false,
//     cart: {
//       ...cartData,
//       itemsPrice: cartData.itemsPrice.toString(),
//       totalPrice: cartData.totalPrice.toString(),
//       shippingPrice: cartData.shippingPrice.toString(),
//       taxPrice: cartData.taxPrice.toString(),
//     },
//   };
// }

// // ----------------- UI Subcomponents -----------------
// function ShippingCard({
//   address,
//   isBuyNow,
// }: {
//   address?: ShippingAddress;
//   isBuyNow: boolean;
// }) {
//   return (
//     <Card>
//       <CardContent className="p-4 gap-4">
//         <h2 className="text-xl pb-4">Shipping Address</h2>
//         {address ? (
//           <>
//             <p>{address.fullName}</p>
//             <p>
//               {address.streetAddress}, {address.city} {address.postalCode},{" "}
//               {address.country}
//             </p>
//             <div className="mt-3">
//               {isBuyNow ? (
//                 <Button variant="outline">Edit</Button>
//               ) : (
//                 <Link href="/shipping-address">
//                   <Button variant="outline">Edit</Button>
//                 </Link>
//               )}
//             </div>
//           </>
//         ) : (
//           <p>No shipping address yet</p>
//         )}
//       </CardContent>
//     </Card>
//   );
// }

// function PaymentCard({ method }: { method?: string }) {
//   if (!method) return null;

//   return (
//     <Card>
//       <CardContent className="p-4 gap-4">
//         <h2 className="text-xl pb-4">Payment Method</h2>
//         <p>{method}</p>
//         <div className="mt-3">
//           <Link href="/payment-method">
//             <Button variant="outline">Edit</Button>
//           </Link>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// function OrderItemsCard({ items }: { items: CartItem[] }) {
//   return (
//     <Card>
//       <CardContent className="p-4 gap-4">
//         <h2 className="text-xl pb-4">Order Items</h2>
//         <Table>
//           <TableHeader>
//             <TableRow>
//               <TableHead>Item</TableHead>
//               <TableHead>Quantity</TableHead>
//               <TableHead>Price</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {items.map((item) => (
//               <TableRow key={item.slug}>
//                 <TableCell>
//                   <Link
//                     href={`/product/${item.slug}`}
//                     className="flex items-center"
//                   >
//                     <Image
//                       src={item.image}
//                       alt={item.name}
//                       width={50}
//                       height={50}
//                     />
//                     <span className="px-2">{item.name}</span>
//                   </Link>
//                 </TableCell>
//                 <TableCell>
//                   <span className="px-2">{item.qty}</span>
//                 </TableCell>
//                 <TableCell className="text-right">${item.price}</TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </CardContent>
//     </Card>
//   );
// }

// function SummaryCard({
//   cart,
//   isBuyNow,
//   productId,
//   qty,
// }: {
//   cart: {
//     items: (CartItem & { qty: number })[];
//     itemsPrice: string;
//     shippingPrice: string;
//     taxPrice: string;
//     totalPrice: string;
//   };
//   isBuyNow: boolean;
//   productId?: string;
//   qty?: string;
// }) {
//   return (
//     <Card>
//       <CardContent className="p-4 gap-4 space-y-4">
//         <div className="flex justify-between">
//           <div>Items</div>
//           <div>{formatCurrency(cart.itemsPrice)}</div>
//         </div>
//         <div className="flex justify-between">
//           <div>Tax</div>
//           <div>{formatCurrency(cart.taxPrice)}</div>
//         </div>
//         <div className="flex justify-between">
//           <div>Shipping</div>
//           <div>{formatCurrency(cart.shippingPrice)}</div>
//         </div>
//         <div className="flex justify-between font-semibold">
//           <div>Total</div>
//           <div>{formatCurrency(cart.totalPrice)}</div>
//         </div>
//         <PlaceOrderForm isBuyNow={isBuyNow} productId={productId} qty={qty} />
//       </CardContent>
//     </Card>
//   );
// }

// // ----------------- Main Page -----------------
// const PlaceOrderPage = async ({
//   searchParams,
// }: {
//   searchParams: Record<string, string | string[] | undefined>;
// }): Promise<JSX.Element> => {
//   const session = await auth();
//   const userId = session?.user?.id;
//   if (!userId) throw new Error("User not found");

//   const user = await getUserById(userId);
//   const { isBuyNow, cart } = await resolveCartData(searchParams);

//   // Redirect guards
//   if (!user.address && !isBuyNow) redirect("/shipping-address");
//   if (!user.paymentMethod && !isBuyNow) redirect("/payment-method");

//   return (
//     <div className="mb-20">
//       <CheckoutSteps current={3} />
//       <h1 className="py-4 text-2xl">Place Order</h1>

//       <div className="grid md:grid-cols-3 md:gap-5">
//         <div className="md:col-span-2 overflow-x-auto space-y-4">
//           <ShippingCard
//             address={user.address as ShippingAddress}
//             isBuyNow={isBuyNow}
//           />
//           {!isBuyNow && <PaymentCard method={user.paymentMethod} />}
//           <OrderItemsCard items={cart.items} />
//         </div>

//         <div>
//           <SummaryCard
//             cart={cart}
//             isBuyNow={isBuyNow}
//             productId={searchParams.productId}
//             qty={searchParams.qty}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PlaceOrderPage;
