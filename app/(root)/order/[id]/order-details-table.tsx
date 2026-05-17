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
import { useState, useTransition } from "react";
import { Loader2, RefreshCw, PackageCheck } from "lucide-react";
import { markOrderAsDelivered } from "@/lib/actions/order.actions";
import PaymentLoadingScreen from "@/components/payment-loading-screen";

interface OrderDetailsTableProps {
  order: Omit<Order, "paymentResult">;
}

const OrderDetailsTable = ({ order }: OrderDetailsTableProps) => {
  const {
    id,
    shippingAddress,
    orderitems,
    itemsPrice,
    shippingPrice,
    totalPrice,
    isDelivered,
    isPaid,
    paidAt,
    deliveredAt,
  } = order;

  // State management for payment re-initialization animations
  const [paymentStage, setPaymentStage] = useState<
    "idle" | "creating" | "push_sent" | "completed"
  >("idle");

  // Transition management for delivery button state updates
  const [isPending, startTransition] = useTransition();

  const handleReinitializePayment = async () => {
    try {
      setPaymentStage("creating");

      const res = await fetch("/api/zenopay/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });

      const data = await res.json();

      if (data.success) {
        setPaymentStage("push_sent");
        // Allow a 6 second window for phone popup and user interaction buffer
        await new Promise((resolve) => setTimeout(resolve, 6000));
        setPaymentStage("completed");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        alert("Imeshindikana kuanzisha malipo ya Zenopay.");
      }
    } catch (error) {
      console.error(error);
      alert("Tatizo limetokea wakati wa kuwasiliana na mfumo wa malipo.");
    } finally {
      setPaymentStage("idle");
    }
  };

  const handleConfirmDelivery = () => {
    if (!confirm("Je, una uhakika umepokea mzigo wako salama?")) return;

    startTransition(async () => {
      const res = await markOrderAsDelivered(id);
      alert(res.message);
    });
  };

  return (
    <>
      {/* 🟢 Full screen payment re-initialization overlay setup */}
      {paymentStage !== "idle" && <PaymentLoadingScreen stage={paymentStage} />}

      <h1 className="py-4 text-sm font-semibold md:text-lg">
        Usimamizi wa Agizo {formatId(id)}
      </h1>
      <div className="grid md:grid-cols-3 md:gap-5">
        <div className="col-span-2 space-y-4 overflow-x-auto">
          {/* Payment Card Info */}
          <Card>
            <CardContent className="p-4 flex flex-col gap-2">
              <h2 className="text-sm font-medium md:text-base">
                Hali ya Malipo
              </h2>
              <p className="text-xs text-blue-700">
                Namba inayohusika: {shippingAddress.paymentPhone}
              </p>
              <div>
                {isPaid ? (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-green-100 text-green-800 hover:bg-green-100"
                  >
                    Imelipiwa mnamo {formatDateTime(paidAt!).dateTime}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Haijalipiwa bado
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Target Location Card */}
          <Card>
            <CardContent className="p-4 flex flex-col gap-2">
              <h2 className="text-sm font-medium md:text-base">
                Mpokeaji & Sehemu ya Mzigo
              </h2>
              <p className="text-xs font-semibold">
                {shippingAddress.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                {shippingAddress.streetAddress}, {shippingAddress.city},{" "}
                {shippingAddress.country}
              </p>
              <div>
                {isDelivered ? (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100"
                  >
                    Imewasilishwa mnamo {formatDateTime(deliveredAt!).dateTime}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Mzigo haujafika bado
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Table list of Items ordered */}
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-medium md:text-base pb-4">
                Vitu Vilivyomo
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Bidhaa</TableHead>
                    <TableHead className="text-xs text-center">Idadi</TableHead>
                    <TableHead className="text-right text-xs">Bei</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderitems.map((item) => (
                    <TableRow key={item.slug}>
                      <TableCell>
                        <Link
                          href={`/product/${item.slug}`}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={50}
                            height={50}
                            className="rounded-md object-cover"
                          />
                          <span className="text-xs max-w-[180px] md:max-w-xs truncate">
                            {item.name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {item.qty}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(item.price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Financial Sidebar Context Summary and Actions */}
        <div className="mt-4 md:mt-0">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="text-sm font-medium md:text-base border-b pb-2">
                Muhtasari wa Gharama
              </h2>
              <div className="flex justify-between items-center text-xs">
                <div className="text-muted-foreground">Bidhaa</div>
                <div>{formatCurrency(itemsPrice)}</div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="text-muted-foreground">Usafiri</div>
                <div>{formatCurrency(shippingPrice)}</div>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold border-t pt-2">
                <div>Jumla Kuu</div>
                <div className="text-green-700">
                  {formatCurrency(totalPrice)}
                </div>
              </div>

              {/* Action 1: If order is unpaid, offer payment retry loop mechanism */}
              {!isPaid && (
                <Button
                  onClick={handleReinitializePayment}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Jaribu Tena Kulipa
                </Button>
              )}

              {/* Action 2: If order is paid but not yet delivered, offer the confirmation button */}
              {isPaid && !isDelivered && (
                <Button
                  onClick={handleConfirmDelivery}
                  disabled={isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PackageCheck className="w-4 h-4" />
                  )}
                  Nimepokea Mzigo huu
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default OrderDetailsTable;
