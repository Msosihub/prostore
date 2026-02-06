import { auth } from "@/auth";
import { getMyCart } from "@/lib/actions/cart.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { getProductById } from "@/lib/actions/product.actions";
import { CartItem, ShippingAddress } from "@/types";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckoutSteps from "@/components/shared/checkup-steps";
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
import PaymentMethodDrawer from "@/components/shared/forms/payment-form drawer";
// import type { PageProps } from "next";

// import { JSX } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Place Order",
};

const shippingAddressDefaultValues = {
  country: "",
  fullName: "",
  streetAddress: "",
  city: "",
  postalCode: "",
  lat: undefined,
  lng: undefined,
};

// We expect query params for buy-now flow
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

  // Narrow searchParams
  // const buyNowParam = searchParams?.buyNow;
  // const productIdParam = searchParams?.productId;
  // const qtyParam = searchParams?.qty;
  const params = use(searchParams) as unknown as params;
  // console.log("SearchParams:", params);

  const isBuyNow = params.buyNow === "1";
  const productId = params.productId;
  const qty = parseInt(params.qty ?? "1", 10);
  const shouldOpenDrawer = !user.address && !isBuyNow;

  // Build 'cart' depending on flow
  let cart: {
    items: (CartItem & { qty: number })[];
    itemsPrice: string;
    shippingPrice: string;
    taxPrice: string;
    totalPrice: string;
  };

  if (isBuyNow) {
    if (!productId) redirect("/"); // invalid URL
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
      taxPrice: "0", //cartData.taxPrice.toString(),
    };
  }

  // If user doesn't have address/payment, normal flow redirects.
  // For buy-now we allow editing inline (drawer) so we don't force redirect.

  // if (!user.address && !isBuyNow) redirect("/shipping-address");
  // if (!user.paymentMethod && !isBuyNow) redirect("/payment-method");

  const userAddress = user.address as ShippingAddress | undefined;
  const paymentMethod = user.paymentMethod as string | undefined;

  return (
    <div className="mb-20">
      <CheckoutSteps current={3} />
      <h1 className="py-4 text-2xl">Agiza Mzigo</h1>
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

      {!user.paymentMethod && !isBuyNow && (
        <PaymentMethodDrawer openByDefault preferredPaymentMethod={null} />
      )}
      <div className="grid md:grid-cols-3 md:gap-5">
        <div className="md:col-span-2 overflow-x-auto space-y-4">
          <Card>
            <CardContent className="p-4 gap-4">
              <h2 className="text-xl pb-4">Mzigo unaenda wapi?</h2>
              {userAddress ? (
                <>
                  <p>{userAddress.fullName}</p>
                  <p>
                    {userAddress.streetAddress}, {userAddress.city} ,{" "}
                    {userAddress.country}
                  </p>
                  <div className="mt-3">
                    {/* In buyNow we’ll show a Drawer Edit control (client component) */}
                    {isBuyNow ? (
                      <ShippingAddressDrawer
                        trigger={<Button variant="outline">Badili</Button>}
                        address={
                          isShippingAddress(user.address)
                            ? user.address
                            : shippingAddressDefaultValues
                        }
                      />
                    ) : (
                      <Link href="/shipping-address">
                        <Button variant="outline">Badili</Button>
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                // <p>Hakuna anuani bado</p>
                <ShippingAddressDrawer
                  openByDefault
                  trigger={<Button variant="outline">Badili</Button>}
                  address={
                    isShippingAddress(user.address)
                      ? user.address
                      : shippingAddressDefaultValues
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* <Card>
            <CardContent className="p-4 gap-4">
              <h2 className="text-xl pb-4">Njia za malipo</h2>
              {paymentMethod ? (
                <>
                  <p>{user.paymentMethod}</p>
                  <div className="mt-3">
                    {isBuyNow ? (
                      <PaymentMethodDrawer
                        trigger={<Button variant="outline">Badili</Button>}
                        preferredPaymentMethod={user.paymentMethod ?? null}
                      />
                    ) : (
                      <Link href="/payment-method">
                        <p>{user.paymentMethod}</p>
                        <Button variant="outline">Badili</Button>
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <PaymentMethodDrawer
                    openByDefault
                    trigger={<Button variant="outline">Badili</Button>}
                    preferredPaymentMethod={user.paymentMethod ?? null}
                  />
                </>
              )}
            </CardContent>
          </Card> */}

          {/* {!isBuyNow && (
            <Card>
              <CardContent className="p-4 gap-4">
                <h2 className="text-xl pb-4">Njia za malipo</h2>
                <p>{user.paymentMethod}</p>
                <div className="mt-3">
                  <Link href="/payment-method">
                    <Button variant="outline">Badili</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )} */}

          <Card>
            <CardContent className="p-4 gap-4">
              <h2 className="text-xl pb-4">Ulivyochagua</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bidhaa</TableHead>
                    <TableHead>Idadi</TableHead>
                    <TableHead className="text-center">Bei</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.items.map((item) => (
                    <TableRow key={item.slug}>
                      <TableCell>
                        <Link
                          href={`/product/${item.slug}`}
                          className="flex items-center"
                        >
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={50}
                            height={50}
                          />
                          <span className="px-2">{item.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="px-2">{item.qty}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.price)}Tsh
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent className="p-4 gap-4 space-y-4">
              <div className="flex justify-between">
                <div>Bidhaa</div>
                <div>{formatCurrency(cart.itemsPrice)}</div>
              </div>
              {/* <div className="flex justify-between">
                <div>Tax</div>
                <div>{formatCurrency(cart.taxPrice)}</div>
              </div> */}
              <div className="flex justify-between">
                <div>Usafiri</div>
                <div>{formatCurrency(cart.shippingPrice)}</div>
              </div>
              <div className="flex justify-between font-semibold">
                <div>Jumla</div>
                <div>{formatCurrency(cart.totalPrice)}</div>
              </div>

              {/* This PlaceOrderForm should be the buy-now variant (client) */}
              <PlaceOrderForm
                isBuyNow={isBuyNow}
                productId={productId}
                qty={qty}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrderPage;
