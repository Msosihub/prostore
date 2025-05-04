import CartTable from "./cart-table";
import { getMyCart } from "@/lib/actions/cart.actions";

export const metadata = {
  title: "Shopping Cart",
};

const CartPage = async () => {
  const cart = await getMyCart();

  const cartData = {
    ...cart,
    itemsPrice: cart?.itemsPrice.toString(),
  };

  return (
    <>
      {/* @ts-ignore */}
      <CartTable cart={cartData} />
    </>
  );
};

export default CartPage;
