import ProductList from "@/components/shared/product/product-list";
import {
  getFeaturedProducts,
  getLatestProducts,
} from "@/lib/actions/product.actions";
import IconBoxes from "@/components/icon-boxes";
import DealCountdown from "@/components/deal-countdown";
import ProductCarousel from "@/components/shared/product/product-carousel";
import ViewAllProductsButton from "@/components/view-all-products-button";
import { getMyCart } from "@/lib/actions/cart.actions";
import MiniCartPanel from "@/components/shared/cart/mini-cart-panel";

export const metadata = {
  title: "Home",
};

export default async function Home() {
  const latestProducts = await getLatestProducts();
  const featuredProducts = await getFeaturedProducts();
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-8">
        {featuredProducts.length > 0 && (
          <ProductCarousel data={featuredProducts} />
        )}
        <ProductList data={latestProducts} title="Newest Arrivals" limit={4} />
        <ViewAllProductsButton />
        <DealCountdown />
        <IconBoxes />
      </div>

      <div className="lg:col-span-1">
        <MiniCartPanel cart={safeCartData} />
      </div>
    </div>
  );
}
