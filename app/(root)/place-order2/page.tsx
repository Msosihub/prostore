import { auth } from "@/auth";
import { getMyCart } from "@/lib/actions/cart.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { getProductById } from "@/lib/actions/product.actions";
import { CartItem, ShippingAddress } from "@/types";
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
import { formatCurrency, isShippingAddress } from "@/lib/utils";
import PlaceOrderForm from "./place-order-form";
import { use } from "react";
import ShippingAddressDrawer from "@/components/shared/forms/ShippingAddressDrawer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kuhakiki Agizo - Place Order",
};

const shippingAddressDefaultValues = {
  country: "",
  fullName: "",
  streetAddress: "",
  city: "",
  postalCode: "",
  paymentPhone: "",
  phone: "",
  lat: undefined,
  lng: undefined,
};

type params = {
  buyNow?: string;
  productId?: string;
  qty?: string;
};

const PlaceOrderPage = ({
  searchParams,
}: {
  searchParams: Promise<URLSearchParams>;
}) => {
  const session = use(auth());
  const userId = session?.user?.id;
  if (!userId) throw new Error("User not found");

  const user = use(getUserById(userId));
  const params = use(searchParams) as unknown as params;

  const isBuyNow = params.buyNow === "1";
  const productId = params.productId;
  const qty = parseInt(params.qty ?? "1", 10);
  const shouldOpenDrawer = !user.address && !isBuyNow;

  let cart: {
    items: (CartItem & { qty: number })[];
    itemsPrice: string;
    shippingPrice: string;
    taxPrice: string;
    totalPrice: string;
  };

  if (isBuyNow) {
    if (!productId) redirect("/");
    const product = use(getProductById(productId));
    if (!product) redirect("/not-found");

    const cartItem: CartItem & { qty: number } = {
      productId: product.id,
      name: product.name,
      qty,
      image: product.images?.[0] ?? "",
      price: product.price.toString(),
      supplierId: product.supplierId,
      slug: product.slug ?? "",
    };

    cart = {
      items: [cartItem],
      itemsPrice: (Number(product.price) * qty).toString(),
      shippingPrice: "0",
      taxPrice: "0",
      totalPrice: (Number(product.price) * qty).toString(),
    };
  } else {
    const cartData = use(getMyCart());
    if (!cartData || cartData.items.length === 0) redirect("/cart");
    cart = {
      ...cartData,
      itemsPrice: cartData.itemsPrice.toString(),
      totalPrice: cartData.totalPrice.toString(),
      shippingPrice: cartData.shippingPrice.toString(),
      taxPrice: "0",
    };
  }

  const userAddress = user.address as ShippingAddress | undefined;
  const paymentPhone = user?.paymentPhone || userAddress?.phone;

  return (
    <div className="pb-28 md:pb-12 max-w-5xl mx-auto px-2 md:px-4 space-y-4">
      <h1 className="text-base font-bold md:text-xl text-slate-900 pt-4">
        Agiza Mzigo
      </h1>

      {shouldOpenDrawer && (
        <ShippingAddressDrawer
          openByDefault
          address={
            isShippingAddress(user.address)
              ? user.address
              : shippingAddressDefaultValues
          }
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Columns Container Area */}
        <div className="md:col-span-2 space-y-3.5">
          {/* Address Information Segment */}
          <Card className="shadow-sm border-slate-100 rounded-xl bg-white">
            <CardContent className="p-3.5 flex flex-col gap-1.5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-1">
                Mzigo unaenda wapi?
              </h2>
              {userAddress ? (
                <div className="space-y-0.5 text-xs text-slate-700">
                  <p className="font-bold text-slate-900">
                    {userAddress.fullName}
                  </p>
                  <p>
                    {userAddress.streetAddress}, {userAddress.city},{" "}
                    {userAddress.country}
                  </p>
                  <p className="pt-1 text-blue-700 font-medium">
                    Namba ya malipo:{" "}
                    <span className="font-mono font-semibold">
                      {paymentPhone}
                    </span>
                  </p>

                  {/* Inline Drawer Address Senders Controllers */}
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    {isBuyNow ? (
                      <ShippingAddressDrawer
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-3 rounded-lg"
                          >
                            Badili Anuani
                          </Button>
                        }
                        address={
                          isShippingAddress(user.address)
                            ? user.address
                            : shippingAddressDefaultValues
                        }
                      />
                    ) : (
                      <Link href="/shipping-address">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs px-3 rounded-lg"
                        >
                          Badili Anuani
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-1">
                  <ShippingAddressDrawer
                    openByDefault
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-lg"
                      >
                        Weka Anuani ya Mzigo
                      </Button>
                    }
                    address={
                      isShippingAddress(user.address)
                        ? user.address
                        : shippingAddressDefaultValues
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Items Table Context Area */}
          <Card className="shadow-sm border-slate-100 rounded-xl overflow-hidden bg-white">
            <CardContent className="p-3.5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100">
                Ulivyochagua
              </h2>

              {/* Desktop Adaptive Display Mode Table */}
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
                    {cart.items.map((item) => (
                      <TableRow
                        key={item.productId}
                        className="border-slate-100"
                      >
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

              {/* Mobile View Block Rows Grid Container Layout */}
              <div className="sm:hidden divide-y divide-slate-100">
                {cart.items.map((item) => (
                  <div
                    key={item.productId}
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

        {/* Pricing Sidebar Element Tray (Desktop Standard Column Layout) */}
        <div className="space-y-4">
          <Card className="shadow-sm border-slate-100 rounded-xl bg-white">
            <CardContent className="p-4 space-y-3.5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b pb-2 border-slate-100">
                Muhtasari wa Gharama
              </h2>

              <div className="flex justify-between items-center text-xs">
                <div className="text-muted-foreground">Bidhaa</div>
                <div className="font-medium text-slate-800">
                  {formatCurrency(cart.itemsPrice)}
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="text-muted-foreground">Usafiri</div>
                <div className="font-medium text-slate-800">
                  {formatCurrency(cart.shippingPrice)}
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-bold border-t pt-2.5 border-slate-100">
                <div className="text-slate-900">Jumla Kuu</div>
                <div className="text-base text-green-700">
                  {formatCurrency(cart.totalPrice)}
                </div>
              </div>

              {/* Desktop Button Submissions Layer Container (Hidden on touch mobile screen sizes) */}
              <div className="hidden md:block pt-2">
                <PlaceOrderForm
                  isBuyNow={isBuyNow}
                  productId={productId}
                  qty={qty}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 📱 MOBILE PERSISTENT STICKY BANNER: Keeps checkout action buttons flat at base of touchscreen */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 p-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] md:hidden flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Jumla ya Malipo
          </span>
          <span className="text-base font-bold text-green-700">
            {formatCurrency(cart.totalPrice)}
          </span>
        </div>
        <div className="flex-1 max-w-[220px]">
          <PlaceOrderForm isBuyNow={isBuyNow} productId={productId} qty={qty} />
        </div>
      </div>
    </div>
  );
};

export default PlaceOrderPage;
