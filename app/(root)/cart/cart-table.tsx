"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Loader2,
  ShoppingBag,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Cart } from "@/types";
import {
  DecrementButton,
  IncrementButton,
} from "@/components/shared/cart/cart-buttons2";

export default function CartTable({ cart }: { cart?: Cart }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const estimatedDelivery = new Intl.DateTimeFormat("sw-TZ", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));

  const cartItems = cart?.items || [];
  const totalItemsCount = cartItems.reduce((acc, c) => acc + c.qty, 0);
  const itemsPrice = Number(cart?.itemsPrice || 0);

  const wholesaleSavings = totalItemsCount >= 5 ? 4000 : 0;

  const handleCheckoutRedirect = () => {
    startTransition(() => {
      router.push("/shipping-address");
    });
  };

  return (
    <div className="w-full pb-12 max-w-5xl mx-auto px-2 md:px-4 space-y-4">
      <div className="flex items-center gap-2 pt-4 px-1">
        <ShoppingBag className="w-5 h-5 text-slate-800" />
        <h1 className="text-base font-bold md:text-xl text-slate-900">
          Kapu la Manunuzi
        </h1>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-slate-50/50 space-y-3">
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Kapu lako la manunuzi ni tupu kwa sasa.
          </p>
          <Button
            asChild
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl h-9 px-4"
          >
            <Link href="/">Nenda Kununua Mzigo</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Main Items Column */}
          <div className="grid grid-cols-1 lg:col-span-3 gap-3">
            {/* 💻 DESKTOP VIEW: Table Grid */}
            <div className="hidden md:block border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/60">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold py-3 pl-4">
                      Bidhaa
                    </TableHead>
                    <TableHead className="text-xs font-semibold py-3 text-center">
                      Kiasi (Qty)
                    </TableHead>
                    <TableHead className="text-xs font-semibold py-3 text-right pr-4">
                      Bei
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartItems.map((item) => (
                    <TableRow
                      key={item.slug}
                      className="border-slate-100 hover:bg-slate-50/40"
                    >
                      <TableCell className="py-4 pl-4">
                        <Link
                          href={`/product/${item.slug}`}
                          className="flex items-center gap-3.5 hover:underline group"
                        >
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={48}
                            height={48}
                            className="rounded-xl object-cover border border-slate-100 shrink-0 bg-slate-50"
                          />
                          <span className="text-xs font-semibold text-slate-800 line-clamp-2 max-w-sm">
                            {item.name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-center gap-2.5">
                          <DecrementButton item={item} />
                          <span className="text-xs font-bold text-slate-800 min-w-[20px] text-center">
                            {item.qty}
                          </span>
                          <IncrementButton item={item} />
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right font-bold text-xs sm:text-sm text-slate-900 pr-4">
                        {formatCurrency(Number(item.price) * item.qty)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 📱 MOBILE VIEW: Flat Stack Cards Array List */}
            <div className="block md:hidden space-y-2.5">
              {cartItems.map((item) => (
                <div
                  key={item.slug}
                  className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex items-center gap-3"
                >
                  <Link
                    href={`/product/${item.slug}`}
                    className="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shrink-0"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-16 py-0.5">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <DecrementButton item={item} />
                      <span className="text-xs font-bold text-slate-800 min-w-[24px] text-center">
                        {item.qty}
                      </span>
                      <IncrementButton item={item} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900">
                      {formatCurrency(Number(item.price) * item.qty)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 🟢 UNIFIED MOBILE SUMMARY CARD BOX */}
            <div className="block md:hidden bg-white border border-slate-100 p-4 rounded-xl shadow-sm space-y-4">
              {wholesaleSavings > 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed font-medium">
                    <span className="font-bold text-emerald-700">Hongera!</span>{" "}
                    Umeokoa{" "}
                    <span className="font-bold">
                      {formatCurrency(wholesaleSavings)}
                    </span>{" "}
                    kwa kununua kwa bei ya Jumla!
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <span className="text-xs font-medium text-slate-500">
                  Jumla Kuu ({totalItemsCount} bidhaa)
                </span>
                <span className="text-base font-extrabold text-green-700 tracking-tight">
                  {formatCurrency(itemsPrice)}
                </span>
              </div>

              <Button
                onClick={handleCheckoutRedirect}
                disabled={isPending}
                className="w-full h-11 bg-slate-900 active:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Lipia Mzigo Sasa <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 💻 Pricing Summary Sidebar (Desktop Only - Fully Sealed & Fixed) */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="shadow-sm border-slate-100 rounded-xl bg-white sticky top-24">
              <CardContent className="p-4 space-y-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 border-slate-50">
                  Muhtasari wa Malipo
                </h2>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500">
                    Jumla ndogo ({totalItemsCount} bidhaa)
                  </div>
                  <div className="text-lg font-extrabold text-green-700 tracking-tight">
                    {formatCurrency(itemsPrice)}
                  </div>
                </div>

                {wholesaleSavings > 0 && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed font-medium">
                      <span className="font-bold text-emerald-700">
                        Hongera!
                      </span>{" "}
                      Umeokoa{" "}
                      <span className="font-bold">
                        {formatCurrency(wholesaleSavings)}
                      </span>{" "}
                      kwa kununua kwa bei ya Jumla!
                    </div>
                  </div>
                )}

                {/* 🟢 FIXED SEALED TIMELINE BOX */}
                <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-start gap-2 leading-relaxed">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    Mzigo utakufikia:
                    <br />
                    <span className="font-semibold text-slate-700">
                      {estimatedDelivery}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm mt-2"
                  disabled={isPending}
                  onClick={handleCheckoutRedirect}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Endelea na Malipo <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
