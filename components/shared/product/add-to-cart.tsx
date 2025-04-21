"use client";

import { CartItem } from "@/types";
import { Button } from "@/components/ui/button";
import { addItemToCat } from "@/lib/actions/cart.actions";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Description } from "@radix-ui/react-toast";

const AddToCart = ({ item }: { item: CartItem }) => {
  const { toast } = useToast();
  const router = useRouter();

  const handleAddToCart = async () => {
    const res = await addItemToCat(item);
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
      description: `${item.name} added to cart`,
      action: (
        <Description className=" text-green-900 hover:text-green-700">
          View Cart
        </Description>
      ),
      onClick: () => router.push("/cart"),
    });
    // Optionally, you can also update the cart state here if needed
    // For example, you can use a context or state management library to update the cart state
    // cartContext.updateCart(res.cart);
    // Or you can redirect to the cart page directly
    // router.push("/cart");
  };

  return (
    <Button className="w-full" type="button" onClick={handleAddToCart}>
      <Plus /> Add to cart
    </Button>
  );
};

export default AddToCart;
