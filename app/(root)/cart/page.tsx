import CartTable from "./cart-table";
import { getMyCart } from "@/lib/actions/cart.actions";

export const metadata = {
  title: "Shopping Cart",
};

const CartPage = async () => {
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

  return (
    <>
      <CartTable cart={safeCartData} />
    </>
  );
};

export default CartPage;
