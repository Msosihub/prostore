"use client";

import { Cart, CartItem } from "@/types";
import { Button } from "@/components/ui/button";
import { addItemToCart, removeItemFromCart } from "@/lib/actions/cart.actions";
import { useToast } from "@/hooks/use-toast";
// import { ToastAction } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { Plus, Minus, Loader } from "lucide-react";
import { Description } from "@radix-ui/react-toast";
import { useTransition } from "react";

const AddToCart = ({ cart, item }: { cart?: Cart; item: CartItem }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleAddToCart = async () => {
    startTransition(async () => {
      const res = await addItemToCart(item);
      //Check if the item is already in the cart

      if (!res.success) {
        toast({
          variant: "destructive",
          description: res.message,
        });
        return;
      }

      //Handle success add to cart
      toast({
        title: "Success",
        description: res.message,
        action: (
          <Description className=" text-green-900 hover:text-green-700">
            View Cart
          </Description>
        ),
        onClick: () => router.push("/cart"),
      });
    });
    // Optionally, you can also update the cart state here if needed
    // For example, you can use a context or state management library to update the cart state
    // cartContext.updateCart(res.cart);
    // Or you can redirect to the cart page directly
    // router.push("/cart");
  };
  // Handle remove from cart
  const handleRemoveFromCart = async () => {
    startTransition(async () => {
      const res = await removeItemFromCart(item.productId);

      toast({
        variant: res.success ? "default" : "destructive",
        description: res.message,
      });

      return;
    });
  };

  // Check if item is in cart
  const existItem =
    cart && cart.items.find((x) => x.productId === item.productId);

  return existItem ? (
    <div>
      <Button type="button" variant="outline" onClick={handleRemoveFromCart}>
        {isPending ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <Minus className="w-4 h-4" />
        )}
      </Button>
      <span className="px-2">{existItem.qty}</span>
      <Button type="button" variant="outline" onClick={handleAddToCart}>
        {isPending ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </Button>
    </div>
  ) : (
    <Button className="w-full" type="button" onClick={handleAddToCart}>
      {isPending ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : (
        <Plus className="w-4 h-4" />
      )}{" "}
      Add To Cart
    </Button>
  );
};

export default AddToCart;
