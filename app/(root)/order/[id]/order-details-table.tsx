"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { formatCurrency, formatDateTime, formatId } from "@/lib/utils";
import {
  Loader2,
  RefreshCw,
  PackageCheck,
  ChevronLeft,
  MapPin,
  Edit3,
  Truck,
} from "lucide-react";
import PaymentLoadingScreen from "@/components/payment-loading-screen";
import GeneralReviewDialog from "@/components/shared/dialogs/general-review-dialog";
import ShippingAddressDrawer from "@/components/shared/forms/ShippingAddressDrawer";
// import { updateOrderShippingAddress } from "@/lib/actions/order-update.actions";
import { ShippingAddress } from "@/types";
import { markOrderItemAsDelivered } from "@/lib/actions/order.actions";

interface LocalOrderItem {
  name: string;
  productId: string;
  slug: string;
  qty: number;
  image: string;
  price: string;
  orderId: string;
  isDelivered: boolean;
  deliveredAt: Date | null;
  supplierId: string | undefined; // Safely accepts null
  supplierName: string | undefined; // Safely accepts null
}

interface LocalOrder {
  id: string;
  createdAt: Date;
  isPaid: boolean;
  paidAt: Date | null;
  isDelivered: boolean;
  deliveredAt: Date | null;
  itemsPrice: string;
  shippingPrice: string;
  taxPrice: string;
  totalPrice: string;
  paymentMethod: string;

  shippingAddress: ShippingAddress;
  user: {
    name: string;
    email: string;
  };
  orderitems: LocalOrderItem[];
}
interface OrderDetailsTableProps {
  order: LocalOrder;
}
export default function OrderDetailsTable({ order }: OrderDetailsTableProps) {
  const {
    id,
    orderitems,
    itemsPrice,
    shippingPrice,
    totalPrice,
    isDelivered,
    isPaid,
    paidAt,
    deliveredAt,
  } = order;

  const shippingAddress = order.shippingAddress as ShippingAddress;

  const [paymentStage, setPaymentStage] = useState<
    "idle" | "creating" | "push_sent" | "completed"
  >("idle");
  const [showGeneralReview, setShowGeneralReview] = useState(false);
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

  // 🟢 DYNAMIC GROUPER: Groups order items by their Supplier to organize the UI cleanly
  const groupItemsBySupplier = (items: LocalOrderItem[]) => {
    // @ts-error i dont know type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups: Record<string, { supplierName: string; list: any[] }> = {};

    items.forEach((item) => {
      const sName = item.supplierName || "Muuzaji wa Nimboya";
      const sId = item.supplierId || "default_vendor";

      if (!groups[sId]) {
        groups[sId] = { supplierName: sName, list: [] };
      }
      groups[sId].list.push(item);
    });

    return Object.values(groups);
  };

  const shipmentPackages = groupItemsBySupplier(orderitems);

  const handleItemReceiptConfirmation = (
    orderId: string,
    productId: string,
    itemName: string
  ) => {
    if (!confirm(`Je, una uhakika umepokea "${itemName}" salama?`)) return;

    startTransition(async () => {
      // 🟢 FIXED CALL: Pass both composite identifiers to target the exact row securely
      const res = await markOrderItemAsDelivered(orderId, productId);

      if (res.success) {
        // Count how many items remain undelivered to trigger the final feedback modal
        const remainingOpenItems = orderitems.filter(
          (i: LocalOrderItem) => !i.isDelivered
        ).length;
        if (remainingOpenItems <= 1) {
          setShowGeneralReview(true);
        }
        alert(res.message);
      } else {
        alert(res.message);
      }
    });
  };

  return (
    <>
      {paymentStage !== "idle" && <PaymentLoadingScreen stage={paymentStage} />}

      <GeneralReviewDialog
        open={showGeneralReview}
        onOpenChange={setShowGeneralReview}
        orderId={id}
      />

      <div className="pb-28 md:pb-12 max-w-5xl mx-auto px-2 md:px-4 space-y-4">
        {/* Nav Header */}
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {/* Main Cards Work area */}
          <div className="grid grid-cols-1 md:col-span-3 gap-3.5">
            {/* Payment Card */}
            <Card className="shadow-sm border-slate-100 rounded-xl bg-white">
              <CardContent className="p-3.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Hali ya Malipo
                  </h2>
                  {!isPaid && (
                    <ShippingAddressDrawer
                      trigger={
                        <button
                          type="button"
                          className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-lg transition-all"
                        >
                          <Edit3 className="w-3 h-3" /> Rekebisha Namba
                        </button>
                      }
                      address={shippingAddress}
                      openByDefault={false}
                    />
                  )}
                </div>
                <p className="text-xs text-slate-800 font-medium">
                  Namba itakayolipa (STK Push):{" "}
                  <span className="font-mono font-semibold text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded-md border border-blue-100/30">
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

            {/* Delivery Location Card */}
            <Card className="shadow-sm border-slate-100 rounded-xl bg-white">
              <CardContent className="p-3.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Mpokeaji & Anuani
                  </h2>
                  {!isPaid && !isDelivered && (
                    <ShippingAddressDrawer
                      trigger={
                        <button
                          type="button"
                          className="text-[11px] font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-all"
                        >
                          <MapPin className="w-3 h-3 text-slate-400" /> Badili
                          Anuani
                        </button>
                      }
                      address={shippingAddress}
                      openByDefault={false}
                    />
                  )}
                </div>
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
                      Vifurushi Vinajisafirisha
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 🟢 MULTI-VENDOR SPLIT SHIPMENT CART ROW LISTS CONTAINER */}
            <div className="space-y-3 pt-1">
              {shipmentPackages.map((pkg, pIdx) => (
                <Card
                  key={pIdx}
                  className="shadow-sm border-slate-100 rounded-2xl overflow-hidden bg-white"
                >
                  {/* Supplier Package Header row decoration banner */}
                  <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Kifurushi kutoka:{" "}
                      <span className="text-orange-600 font-extrabold">
                        {pkg.supplierName}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-white text-slate-500 font-medium px-2 py-0.5 rounded-md border-slate-200"
                    >
                      Bidhaa: {pkg.list.length}
                    </Badge>
                  </div>

                  {/* List Body items content entries */}
                  <CardContent className="p-0 divide-y divide-slate-100">
                    {pkg.list.map((item: LocalOrderItem) => (
                      <div
                        key={`${item.orderId}-${item.productId}`}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/product/${item.slug}`}
                              className="text-xs font-bold text-slate-800 hover:text-orange-600 hover:underline transition-colors line-clamp-1"
                            >
                              {item.name}
                            </Link>
                            <p className="text-[11px] text-slate-400 font-medium pt-0.5">
                              Idadi:{" "}
                              <span className="font-bold text-slate-600">
                                {item.qty}
                              </span>{" "}
                              • Thamani:{" "}
                              {formatCurrency(Number(item.price) * item.qty)}
                            </p>
                          </div>
                        </div>

                        {/* Item actions handler controller cell */}
                        <div className="flex items-center sm:justify-end shrink-0 pt-2 sm:pt-0 border-t border-dashed border-slate-50 sm:border-0 w-full sm:w-auto">
                          {item.isDelivered ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Umekwisha Pokea Hii
                            </span>
                          ) : (
                            <div className="w-full sm:w-auto">
                              {isPaid ? (
                                <Button
                                  size="sm"
                                  disabled={isPending}
                                  // 🟢 PASS BOTH: orderId and productId inside our loop parameters accurately
                                  onClick={() =>
                                    handleItemReceiptConfirmation(
                                      id,
                                      item.productId,
                                      item.name
                                    )
                                  }
                                  className="h-8 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl px-3 flex items-center justify-center gap-1 shadow-sm w-full sm:w-auto"
                                >
                                  {isPending ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <PackageCheck className="w-3.5 h-3.5" />
                                  )}
                                  Nimepokea Bidhaa Hii
                                </Button>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-400 italic flex items-center gap-1 px-1">
                                  <Truck className="w-3.5 h-3.5 text-slate-300 animate-pulse" />{" "}
                                  Inasubiri Malipo
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Pricing Summary Sidebar Element Panel (Desktop viewports - Fixed Mid screen layout gaps) */}
          <div className="hidden md:block md:col-span-1">
            <Card className="shadow-sm border-slate-100 rounded-xl bg-white sticky top-24">
              <CardContent className="p-4 space-y-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 border-slate-50">
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
                  <div>Jumla Kuu</div>
                  <div className="text-green-700">
                    {formatCurrency(totalPrice)}
                  </div>
                </div>

                <div className="pt-2">
                  {!isPaid && (
                    <Button
                      onClick={handleReinitializePayment}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Jaribu Tena Kulipa
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 📱 MOBILE PERSISTENT FLOATING STICKY ACTION TRAY BOTTOM (Only show re-payment loops if unpaid) */}
      {!isPaid && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 p-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] md:hidden flex items-center justify-between gap-4 pb-safe bg-white/95 backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Jumla ya Malipo
            </span>
            <span className="text-sm font-extrabold text-green-700 tracking-tight">
              {formatCurrency(totalPrice)}
            </span>
          </div>
          <div className="flex-1 max-w-[200px]">
            <Button
              onClick={handleReinitializePayment}
              className="w-full h-11 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Jaribu Tena Kulipa
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
