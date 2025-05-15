// components/cart/mini-cart-panel.tsx
"use client";

import { Cart } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { AddButton, RemoveButton } from "./cart-buttons";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MiniCartPanel = ({ cart }: { cart?: Cart }) => {
  if (!cart || cart.items.length === 0) {
    return (
      <div className="p-4 text-sm border rounded bg-white shadow">
        <p>Your cart is empty.</p>
        <Link href="/" className="text-blue-600 underline">
          Go Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-md shadow bg-white space-y-4 text-sm">
      <h3 className="text-lg font-semibold">Your Cart</h3>
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {cart.items.map((item) => (
          <div key={item.slug} className="flex items-center gap-2">
            <Image src={item.image} alt={item.name} width={40} height={40} />
            <div className="flex-1">
              <Link
                href={`/product/${item.slug}`}
                className="font-medium text-sm"
              >
                {item.name}
              </Link>
              <div className="flex items-center gap-2">
                <RemoveButton item={item} />
                <span>{item.qty}</span>
                <AddButton item={item} />
              </div>
            </div>
            <div className="text-right font-medium">${item.price}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between font-medium pt-2 border-t">
        <span>Subtotal</span>
        <span>{formatCurrency(cart.itemsPrice)}</span>
      </div>

      <Button asChild className="w-full mt-2">
        <Link href="/cart">View Full Cart</Link>
      </Button>
    </div>
  );
};

export default MiniCartPanel;
