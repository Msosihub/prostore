import { CartItem } from "@/types";

export async function addItemToCat(data: CartItem) {
  return {
    success: true,
    message: "Item added to cart",
  };
}
