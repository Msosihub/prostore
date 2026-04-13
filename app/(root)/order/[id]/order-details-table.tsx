"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, formatId } from "@/lib/utils";
import { Order } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Loader } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import { useTransition } from "react";
// import {
//   PayPalButtons,
//   PayPalScriptProvider,
//   usePayPalScriptReducer,
// } from "@paypal/react-paypal-js";
// import {
//   createPayPalOrder,
//   approvePayPalOrder,
//   updateOrderToPaidCOD,
//   deliverOrder,
// } from "@/lib/actions/order.actions";
// import StripePayment from "./stripe-payment";

// import { createPesapalOrder } from "@/lib/actions/order.actions";

const OrderDetailsTable = ({
  order,
  // paypalClientId,
  isAdmin,
  // stripeClientSecret,
}: {
  order: Omit<Order, "paymentResult">;
  paypalClientId: string;
  isAdmin: boolean;
  // stripeClientSecret: string | null;
}) => {
  const {
    id,
    shippingAddress,
    orderitems,
    itemsPrice,
    shippingPrice,
    totalPrice,
    paymentMethod,
    isDelivered,
    isPaid,
    paidAt,
    deliveredAt,
  } = order;

  // const { toast } = useToast();

  // const PrintLoadingState = () => {
  //   const [{ isPending, isRejected }] = usePayPalScriptReducer();
  //   let status = "";

  //   if (isPending) {
  //     status = "Loading PayPal...";
  //   } else if (isRejected) {
  //     status = "Error Loading PayPal";
  //   }
  //   return status;
  // };

  // const handleCreatePayPalOrder = async () => {
  //   const res = await createPayPalOrder(order.id);

  //   if (!res.success) {
  //     toast({
  //       variant: "destructive",
  //       description: res.message,
  //     });
  //   }

  // return res.data;
  // };

  // const handleApprovePayPalOrder = async (data: { orderID: string }) => {
  //   const res = await approvePayPalOrder(order.id, data);

  //   toast({
  //     variant: res.success ? "default" : "destructive",
  //     description: res.message,
  //   });
  // };
  const [paying, setPaying] = useState(false);

  const payWithZenopay = async () => {
    try {
      setPaying(true);

      const res = await fetch("/api/zenopay/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await res.json();

      if (data.success) {
        alert(
          "Maombi ya malipo yametumwa kwenye simu yako. Angalia simu na uweke password yako"
        );
      } else {
        alert("Malipo yameshindikana kuanzishwa");
      }
    } catch (error) {
      alert("Tatizo limetokea wakati wa kuanzisha malipo");
      console.log(error);
    } finally {
      setPaying(false);
    }
  };

  // Button to mark order as paid
  const MarkAsPaidButton = () => {
    // const [isPending, startTransition] = useTransition();
    // const { toast } = useToast();

    return (
      <Button
        type="button"
        // disabled={isPending}
        // onClick={() =>
        //   startTransition(async () => {
        //     const res = await updateOrderToPaidCOD(order.id);
        //     toast({
        //       variant: res.success ? "default" : "destructive",
        //       description: res.message,
        //     });
        //   })
        // }
      >
        {/* {isPending ? "processing..." : "Mark As Paid"} */}
      </Button>
    );
  };

  // Button to mark order as delivered
  const MarkAsDeliveredButton = () => {
    //   const [isPending, startTransition] = useTransition();
    //   const { toast } = useToast();

    return (
      <Button
        type="button"
        // disabled={isPending}
        // onClick={() =>
        //   startTransition(async () => {
        //     const res = await deliverOrder(order.id);
        //     toast({
        //       variant: res.success ? "default" : "destructive",
        //       description: res.message,
        //     });
        //   })
        // }
      >
        {/* {isPending ? "processing..." : "Mark As Delivered"} */}
      </Button>
    );
  };

  return (
    <>
      <h1 className="py-4 text-sm  md:text-lg">Order {formatId(id)}</h1>
      <div className="grid md:grid-cols-3 md:gap-5">
        <div className="col-span-2 space-4-y overlow-x-auto">
          <Card>
            <CardContent className="p-4 gap-4">
              <h2 className="tex-sm md:text-lg pb-4">Njia za malipo</h2>
              <p className="mb-2 text-xs text-blue-700">
                {/* {paymentMethod} */}
                Namba itakayolipa: {shippingAddress.paymentPhone}
              </p>
              {isPaid ? (
                <Badge variant="secondary">
                  Paid at {formatDateTime(paidAt!).dateTime}
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  Haijalipiwa
                </Badge>
              )}
            </CardContent>
          </Card>
          <Card className="my-2">
            <CardContent className="p-4 gap-4">
              <h2 className="txt-sm md:text-lg pb-4">Anuani ya mzigo</h2>
              <p className="text-xs">{shippingAddress.fullName}</p>
              <p className="mb-2 text-xs">
                {shippingAddress.streetAddress}, {shippingAddress.city}
                {/* {shippingAddress.postalCode} */}, {shippingAddress.country}
              </p>
              <p className="text-xs text-blue-700">
                Namba ya malipo:{" "}
                <span className="text-blue-700">
                  {shippingAddress.paymentPhone}
                </span>
              </p>
              {isDelivered ? (
                <Badge variant="secondary">
                  Delivered at {formatDateTime(deliveredAt!).dateTime}
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  Haujafika
                </Badge>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 gap-4">
              <h2 className="text-sm md:text-lg pb-4">Vitu ulivyoagiza</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Bidhaa</TableHead>
                    <TableHead className="text-xs">Idadi</TableHead>
                    <TableHead className="text-center text-xs">Bei</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderitems.map((item) => (
                    <TableRow key={item.slug}>
                      <TableCell>
                        <Link
                          href={`/product/{item.slug}`}
                          className="flex items-center"
                        >
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={50}
                            height={50}
                          />
                          <span className="px-2 text-xs">{item.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 text-xs">{item.qty}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="mt-2 md:mt-4">
          <Card>
            <CardContent className="p-4 gap-4 space-y-4">
              <div className="flex justify-between">
                <div className="text-xs">Bidhaa</div>
                <div className="text-xs">{formatCurrency(itemsPrice)}</div>
              </div>
              {/* <div className="flex justify-between">
                <div>Tax</div>
                <div>{formatCurrency(taxPrice)}</div>
              </div> */}
              <div className="flex justify-between">
                <div className="text-xs">Usafiri</div>
                <div>{formatCurrency(shippingPrice)}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-xs">Jumla</div>
                <div className="text-xs">{formatCurrency(totalPrice)}</div>
              </div>

              {/* PESAPAL Payment !isPaid && paymentMethod === "Pesapal" */}
              {true && (
                <Button
                  onClick={payWithZenopay}
                  disabled={paying}
                  className="w-full bg-green-600"
                >
                  {paying ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Inasubiri uthibitisho wa malipo... Angalia simu yako.
                    </>
                  ) : (
                    <>Lipa kwa Simu</>
                  )}
                </Button>

                // <Button
                //   onClick={async () => {
                //     const res = await createPesapalOrder(order.id);
                //     if (res.success) {
                //       window.location.href = res.redirectUrl;
                //     } else {
                //       toast({
                //         variant: "destructive",
                //         description: res.message,
                //       });
                //     }
                //   }}
                //   className="w-full"
                // >
                //   Lipa kwa Pesapal
                // </Button>
              )}

              {/* PayPal Payment */}
              {/* {!isPaid && paymentMethod === "PayPal" && (
                <div>
                  <PayPalScriptProvider options={{ clientId: paypalClientId }}>
                    <PrintLoadingState />
                    <PayPalButtons
                      createOrder={handleCreatePayPalOrder}
                      onApprove={handleApprovePayPalOrder}
                    />
                  </PayPalScriptProvider>
                </div>
              )} */}

              {/* Stripe Payment */}
              {/* {!isPaid && paymentMethod === "Stripe" && stripeClientSecret && (
                <StripePayment
                  priceInCents={Number(order.totalPrice) * 100}
                  orderId={order.id}
                  clientSecret={stripeClientSecret}
                />
              )} */}

              {/* Cash On Delivery */}
              {isAdmin && !isPaid && paymentMethod === "CashOnDelivery" && (
                <MarkAsPaidButton />
              )}
              {isAdmin && isPaid && !isDelivered && <MarkAsDeliveredButton />}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default OrderDetailsTable;
