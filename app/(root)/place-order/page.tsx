import { auth } from "@/auth";
import { getMyCart } from "@/lib/actions/cart.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { ShippingAddress } from "@/types";
import { Metadata } from "next";
import { redirect } from "next/navigation";
// import CheckoutSteps from "@/components/shared/checkup-steps";
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
  title: "Place Order",
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

  if (!safeCartData || safeCartData.items.length === 0)
    redirect("/safeCartData");
  if (!user.address) redirect("/shipping-address");
  //if (!user.paymentMethod) redirect("/payment-method");

  const userAddress = user.address as ShippingAddress;
  const paymentPhone = user?.paymentPhone;

  return (
    <div className="mb-20">
      {/* <CheckoutSteps current={3} /> */}
      <h1 className="py-4 text-lg md:text-xl">Weka Agizo</h1>
      <div className="grid md:grid-cols-3 gap-2 md:gap-5">
        <div className="md:col-span-2 overflow-x-auto space-y-4">
          <Card>
            <CardContent className="p-4 gap-4">
              <h2 className="text-sm pb-2">Mzigo unaenda wapi?</h2>
              <p className="text-xs text-muted-foreground">
                {userAddress.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                {userAddress.streetAddress}, {userAddress.city}{" "}
                {/* {userAddress.postalCode}, */}
                {userAddress.country}{" "}
              </p>
              <p className="text-xs text-muted-foreground">
                Namba ya malipo:{" "}
                <span className="text-gray-800">{paymentPhone}</span>
              </p>
              <div className="mt-3">
                <Link href="/shipping-address">
                  <Button variant="outline" className="text-gray-900">
                    Badili
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* <Card>
            <CardContent className="p-4 gap-4 hidden">
              <h2 className="text-xl pb-4">Njia ya malipo</h2>
              <p>{user.paymentMethod}</p>
              <div className="mt-3">
                <Link href="/payment-method">
                  <Button variant="outline">Badili</Button>
                </Link>
              </div>
            </CardContent>
          </Card> */}

          <Card>
            <CardContent className="p-4 gap-4">
              <h2 className="text-lg md:text-xl pb-4">Vitu vya Agizo</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Bidhaa</TableHead>
                    <TableHead className="text-xs">Kiasi</TableHead>
                    <TableHead className="text-xs">Bei</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeCartData.items.map((item) => (
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
                          <span className="px-2 text-xs md:text-sm">
                            {item.name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="px-2">{item.qty}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        Tsh {item.price}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="mt-2">
          <Card>
            <CardContent className="p-4 gap-4 space-y-4">
              <div className="flex justify-between text-sm">
                <div className="text-sm text-gray-800">Vitu</div>
                <div className="text-sm text-gray-800">
                  {formatCurrency(safeCartData.itemsPrice)}
                </div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-800">Kodi</div>
                <div className="text-sm text-gray-800">
                  {formatCurrency(safeCartData.taxPrice)}
                </div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-800">Usafirishaji</div>
                <div className="text-sm text-gray-800">
                  {formatCurrency(safeCartData.shippingPrice)}
                </div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-900">Jumla</div>
                <div className="text-sm text-gray-900">
                  {formatCurrency(safeCartData.totalPrice)}.00
                </div>
              </div>
              <PlaceOrderForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrderPage;
