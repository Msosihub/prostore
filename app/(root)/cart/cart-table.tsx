"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight, Loader } from "lucide-react";

import { Cart } from "@/types";
import Link from "next/link";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

//import { AddButton, RemoveButton } from "@/components/shared/cart/cart-buttons";
import {
  DecrementButton,
  IncrementButton,
} from "@/components/shared/cart/cart-buttons2";

// NOTE: The code here has changed from the original course code so that the
// Buttons no longer share the same state and show the loader independently from
// other items in the cart

const CartTable = ({ cart }: { cart?: Cart }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const estimatedDelivery = new Intl.DateTimeFormat("sw", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));

  // console.log(estimatedDelivery); // e.g., "Jumamosi, Septemba 28"

  return (
    <>
      <h1 className="py-4 px-4 sm:px-6 lg:px-12 text-2xl font-bold text-gray-800">
        Kapu la Manunuzi
      </h1>

      {!cart || cart.items.length === 0 ? (
        <div className="px-4 sm:px-6 lg:px-12 text-gray-600">
          Kapu ni tupu.{" "}
          <Link href="/" className="text-blue-600 underline">
            Nenda Kununua
          </Link>
        </div>
      ) : (
        <section className="px-4 py-6 sm:px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
          {/* Cart Items */}
          <div className="lg:col-span-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bidhaa</TableHead>
                  <TableHead className="text-center">Kiasi</TableHead>
                  <TableHead className="text-right">Bei</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.items.map((item) => (
                  <TableRow key={item.slug}>
                    <TableCell>
                      <Link
                        href={`/product/${item.slug}`}
                        className="flex items-center gap-3"
                      >
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={50}
                          height={50}
                          className="hidden sm:block  rounded-md object-cover"
                        />
                        <span className="text-sm sm:text-base text-gray-700">
                          {item.name}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="flex justify-center items-center">
                      <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                        <IncrementButton item={item} />
                        <span className="text-sm font-medium text-gray-700">
                          {item.qty}
                        </span>
                        <DecrementButton item={item} />
                      </div>
                    </TableCell>

                    <TableCell className="text-right text-sm font-medium text-gray-800">
                      {item.price}/=
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Sticky Summary Card */}
          <div className="lg:col-span-1 lg:static lg:top-auto lg:z-auto sticky bottom-0 z-10 bg-white shadow-md rounded-md">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="text-lg font-semibold text-gray-700">
                  Jumla ndogo ({cart.items.reduce((a, c) => a + c.qty, 0)}):{" "}
                  <span className="font-bold text-green-700">
                    {formatCurrency(cart.itemsPrice)}
                  </span>
                </div>

                <div className="text-sm text-gray-500">
                  Mzigo utakufikia:{" "}
                  <span className="font-medium text-gray-700">
                    {estimatedDelivery}
                  </span>
                </div>

                <Button
                  className="w-full py-3 text-base font-semibold"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => router.push("/shipping-address"))
                  }
                >
                  {isPending ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}{" "}
                  Endelea na malipo
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </>
  );
};

export default CartTable;
