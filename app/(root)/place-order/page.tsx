import { auth } from "@/auth";
import { getMyCart } from "@/lib/actions/cart.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { ShippingAddress } from "@/types";
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
  if (!user.paymentMethod) redirect("/payment-method");

  const userAddress = user.address as ShippingAddress;

  return (
    <div className="mb-20">
      <CheckoutSteps current={3} />
      <h1 className="py-4 text-2xl">Weka Agizo</h1>
      <div className="grid md:grid-cols-3 md:gap-5">
        <div className="md:col-span-2 overflow-x-auto space-y-4">
          <Card>
            <CardContent className="p-4 gap-4">
              <h2 className="text-xl pb-4">Anwani ya Usafirishaji</h2>
              <p>{userAddress.fullName}</p>
              <p>
                {userAddress.streetAddress}, {userAddress.city}{" "}
                {/* {userAddress.postalCode}, */}
                {userAddress.country}{" "}
              </p>
              <div className="mt-3">
                <Link href="/shipping-address">
                  <Button variant="outline">Badili</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 gap-4">
              <h2 className="text-xl pb-4">Njia ya malipo</h2>
              <p>{user.paymentMethod}</p>
              <div className="mt-3">
                <Link href="/payment-method">
                  <Button variant="outline">Badili</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 gap-4">
              <h2 className="text-xl pb-4">Vitu vya Agizo</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bidhaa</TableHead>
                    <TableHead>Kiasi</TableHead>
                    <TableHead>Bei</TableHead>
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
                          <span className="px-2">{item.name}</span>
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
        <div>
          <Card>
            <CardContent className="p-4 gap-4 space-y-4">
              <div className="flex justify-between">
                <div>Vitu</div>
                <div>{formatCurrency(safeCartData.itemsPrice)}</div>
              </div>
              <div className="flex justify-between">
                <div>Kodi</div>
                <div>{formatCurrency(safeCartData.taxPrice)}</div>
              </div>
              <div className="flex justify-between">
                <div>Usafirishaji</div>
                <div>{formatCurrency(safeCartData.shippingPrice)}</div>
              </div>
              <div className="flex justify-between">
                <div>Jumla</div>
                <div>{formatCurrency(safeCartData.totalPrice)}</div>
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
