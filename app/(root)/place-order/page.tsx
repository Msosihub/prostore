import { auth } from "@/auth";
import { getMyCart } from "@/lib/actions/cart.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { ShippingAddress } from "@/types";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import PlaceOrderForm from "./place-order-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Weka Agizo",
};

const PlaceOrderPage = async () => {
  const cartData = await getMyCart();

  const safeCartData = cartData
    ? {
        ...cartData,
        itemsPrice: cartData.itemsPrice.toString(),
        totalPrice: cartData.totalPrice.toString(),
        shippingPrice: cartData.shippingPrice.toString(),
        taxPrice: cartData.taxPrice.toString(),
      }
    : undefined;

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) throw new Error("User not found");

  const user = await getUserById(userId);

  if (!safeCartData || safeCartData.items.length === 0) {
    redirect("/cart"); // Fixed from redirect("/safeCartData") to clear empty states cleanly
  }
  if (!user.address) redirect("/shipping-address");

  const userAddress = user.address as ShippingAddress;
  const paymentPhone = user?.paymentPhone || userAddress?.phone;

  return (
    <div className="pb-28 md:pb-12 max-w-5xl mx-auto px-2 md:px-4 space-y-4">
      {/* Page Header */}
      <h1 className="text-base font-bold md:text-xl text-slate-900 pt-4">
        Weka Agizo
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Side Content Blocks */}
        <div className="md:col-span-2 space-y-3.5">
          {/* Destination Delivery Card */}
          <Card className="shadow-sm border-slate-100 rounded-xl bg-white">
            <CardContent className="p-3.5 flex flex-col gap-1.5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-1">
                Mzigo unaenda wapi?
              </h2>
              <div className="space-y-0.5 text-xs text-slate-700">
                <p className="font-bold text-slate-900">
                  {userAddress.fullName}
                </p>
                <p>
                  {userAddress.streetAddress}, {userAddress.city},{" "}
                  {userAddress.country}
                </p>
                <p className="pt-1.5 text-blue-700 font-medium">
                  Namba ya malipo:{" "}
                  <span className="font-mono font-semibold">
                    {paymentPhone}
                  </span>
                </p>

                <div className="pt-3 border-t border-slate-100 mt-2">
                  <Link href="/shipping-address">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs px-3 rounded-lg text-slate-700 border-slate-200"
                    >
                      Badili Anuani
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ordered Items Layout Block */}
          <Card className="shadow-sm border-slate-100 rounded-xl overflow-hidden bg-white">
            <CardContent className="p-3.5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100">
                Vitu vya Agizo
              </h2>

              {/* Desktop Adaptive Data Table View */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="text-xs px-1">Bidhaa</TableHead>
                      <TableHead className="text-xs text-center">
                        Kiasi
                      </TableHead>
                      <TableHead className="text-right text-xs px-1">
                        Bei
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeCartData.items.map((item) => (
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
                              className="rounded-lg object-cover bg-slate-50 shrink-0"
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

              {/* Mobile Adaptive Stacked Rows View */}
              <div className="sm:hidden divide-y divide-slate-100">
                {safeCartData.items.map((item) => (
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
                        Kiasi:{" "}
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

        {/* Right Side Cost Calculation Summary Bar (Desktop Viewports Layout Only) */}
        <div className="space-y-4">
          <Card className="shadow-sm border-slate-100 rounded-xl bg-white">
            <CardContent className="p-4 space-y-3.5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b pb-2 border-slate-100">
                Muhtasari wa Gharama
              </h2>

              <div className="flex justify-between items-center text-xs">
                <div className="text-muted-foreground">Vitu</div>
                <div className="font-medium text-slate-800">
                  {formatCurrency(safeCartData.itemsPrice)}
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="text-muted-foreground">Kodi</div>
                <div className="font-medium text-slate-800">
                  {formatCurrency(safeCartData.taxPrice)}
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="text-muted-foreground">Usafirishaji</div>
                <div className="font-medium text-slate-800">
                  {formatCurrency(safeCartData.shippingPrice)}
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-bold border-t pt-2.5 border-slate-100">
                <div className="text-slate-900">Jumla Kuu</div>
                <div className="text-base text-green-700">
                  {formatCurrency(safeCartData.totalPrice)}
                </div>
              </div>

              {/* Desktop Submission Button Element Container Frame */}
              <div className="hidden md:block pt-2">
                <PlaceOrderForm />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 📱 SMARTPHONE PERSISTENT FLOATING STICKY HOUSING: Fast, easy thumb checkouts on mobile screens */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 p-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] md:hidden flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Jumla Kuu
          </span>
          <span className="text-base font-bold text-green-700">
            {formatCurrency(safeCartData.totalPrice)}
          </span>
        </div>
        <div className="flex-1 max-w-[220px]">
          <PlaceOrderForm />
        </div>
      </div>
    </div>
  );
};

export default PlaceOrderPage;
