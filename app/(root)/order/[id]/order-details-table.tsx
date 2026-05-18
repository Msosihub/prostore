"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime, formatId } from "@/lib/utils";
import { Loader2, RefreshCw, PackageCheck, ChevronLeft } from "lucide-react";
import { markOrderAsDelivered } from "@/lib/actions/order.actions";
import PaymentLoadingScreen from "@/components/payment-loading-screen";
import { Order } from "@/types";

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

  const [paymentStage, setPaymentStage] = useState<
    "idle" | "creating" | "push_sent" | "completed"
  >("idle");
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
      {/* Full screen payment re-initialization overlay setup */}
      {paymentStage !== "idle" && <PaymentLoadingScreen stage={paymentStage} />}

      <div className="pb-24 md:pb-6 max-w-5xl mx-auto px-2 md:px-4 space-y-4">
        {/* Navigation Header Layout */}
        <div className="flex items-center gap-2 pt-3">
          <Link
            href="/user/orders"
            className="p-1 hover:bg-slate-100 rounded-lg md:hidden"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <h1 className="text-base font-bold md:text-xl text-slate-900">
            Usimamizi wa Agizo {formatId(id)}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Info Blocks Area */}
          <div className="md:col-span-2 space-y-3.5">
            {/* Payment Status Card */}
            <Card className="shadow-sm border-slate-100 rounded-xl">
              <CardContent className="p-3.5 flex flex-col gap-1.5">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Hali ya Malipo
                </h2>
                <p className="text-xs text-slate-800 font-medium">
                  Namba inayohusika:{" "}
                  <span className="font-mono text-blue-600">
                    {shippingAddress.paymentPhone}
                  </span>
                </p>
                <div className="pt-0.5">
                  {isPaid ? (
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full px-2.5 py-0.5"
                    >
                      Imelipiwa mnamo {formatDateTime(paidAt!).dateTime}
                    </Badge>
                  ) : (
                    <Badge
                      variant="destructive"
                      className="text-[11px] font-medium bg-rose-50 text-rose-700 border-rose-200 rounded-full px-2.5 py-0.5"
                    >
                      Haijalipiwa bado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address Card */}
            <Card className="shadow-sm border-slate-100 rounded-xl">
              <CardContent className="p-3.5 flex flex-col gap-1.5">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Mpokeaji & Anuani
                </h2>
                <p className="text-xs font-bold text-slate-900">
                  {shippingAddress.fullName}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {shippingAddress.streetAddress}, {shippingAddress.city},{" "}
                  {shippingAddress.country}
                </p>
                <div className="pt-0.5">
                  {isDelivered ? (
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-medium bg-blue-50 text-blue-700 border-blue-200 rounded-full px-2.5 py-0.5"
                    >
                      Imewasilishwa mnamo{" "}
                      {formatDateTime(deliveredAt!).dateTime}
                    </Badge>
                  ) : (
                    <Badge
                      variant="destructive"
                      className="text-[11px] font-medium bg-amber-50 text-amber-700 border-amber-200 rounded-full px-2.5 py-0.5"
                    >
                      Mzigo haujafika bado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Table List of Items Ordered */}
            <Card className="shadow-sm border-slate-100 rounded-xl overflow-hidden">
              <CardContent className="p-3.5">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100">
                  Vitu Vilivyomo
                </h2>

                {/* Desktop View Table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="text-xs px-1">Bidhaa</TableHead>
                        <TableHead className="text-xs text-center">
                          Idadi
                        </TableHead>
                        <TableHead className="text-right text-xs px-1">
                          Bei
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderitems.map((item) => (
                        <TableRow key={item.slug} className="border-slate-100">
                          <TableCell className="px-1 py-3">
                            <Link
                              href={`/product/${item.slug}`}
                              className="flex items-center gap-3 hover:underline"
                            >
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={44}
                                height={44}
                                className="rounded-lg object-cover bg-slate-50"
                              />
                              <span className="text-xs font-medium text-slate-800 truncate max-w-xs">
                                {item.name}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-center text-xs font-semibold text-slate-700">
                            {item.qty}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-slate-900 px-1">
                            {formatCurrency(item.price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Item Blocks Layout */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {orderitems.map((item) => (
                    <div
                      key={item.slug}
                      className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="rounded-lg object-cover bg-slate-50 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Idadi:{" "}
                          <span className="font-semibold text-slate-700">
                            {item.qty}
                          </span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-900">
                          {formatCurrency(Number(item.price) * item.qty)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Sidebar Context Summary (Desktop Column Layout) */}
          <div className="space-y-4">
            <Card className="shadow-sm border-slate-100 rounded-xl bg-white">
              <CardContent className="p-4 space-y-3.5">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b pb-2 border-slate-100">
                  Muhtasari wa Gharama
                </h2>

                <div className="flex justify-between items-center text-xs">
                  <div className="text-muted-foreground">Bidhaa</div>
                  <div className="font-medium text-slate-800">
                    {formatCurrency(itemsPrice)}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div className="text-muted-foreground">Usafiri</div>
                  <div className="font-medium text-slate-800">
                    {formatCurrency(shippingPrice)}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-bold border-t pt-2.5 border-slate-100">
                  <div className="text-slate-900">Jumla Kuu</div>
                  <div className="text-base text-green-700">
                    {formatCurrency(totalPrice)}
                  </div>
                </div>

                {/* Sidebar Desktop Interaction Area (Hidden on mobile screen sizes) */}
                <div className="hidden md:block pt-2">
                  {!isPaid && (
                    <Button
                      onClick={handleReinitializePayment}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Jaribu Tena Kulipa
                    </Button>
                  )}

                  {isPaid && !isDelivered && (
                    <Button
                      onClick={handleConfirmDelivery}
                      disabled={isPending}
                      className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PackageCheck className="w-3.5 h-3.5" />
                      )}
                      Nimepokea Mzigo huu
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY FOOTER TRAY AREA: Automatically floats action panels on smartphones */}
      {(!isPaid || (isPaid && !isDelivered)) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] md:hidden flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Jumla ya Malipo
            </span>
            <span className="text-sm font-bold text-green-700">
              {formatCurrency(totalPrice)}
            </span>
          </div>
          <div className="flex-1 max-w-[240px]">
            {!isPaid && (
              <Button
                onClick={handleReinitializePayment}
                className="w-full h-11 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Jaribu Tena Kulipa
              </Button>
            )}

            {isPaid && !isDelivered && (
              <Button
                onClick={handleConfirmDelivery}
                disabled={isPending}
                className="w-full h-11 bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PackageCheck className="w-3.5 h-3.5" />
                )}
                Nimepokea Mzigo
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default OrderDetailsTable;
