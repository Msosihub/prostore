import ProductList from "@/components/shared/product/product-list";
import {
  getFeaturedProducts,
  getLatestProducts,
} from "@/lib/actions/product.actions";
import IconBoxes from "@/components/icon-boxes";
import DealCountdown from "@/components/deal-countdown";
import ProductCarousel from "@/components/shared/product/product-carousel";
import ViewAllProductsButton from "@/components/view-all-products-button";
import RandomProducts from "@/components/shared2/products/random-products";
// import RandomOneSection from "@/components/shared2/products/random-one-section";
// import RandomOneSectionHeading from "@/components/shared2/products/random-one-section2";
// import RandomSupplierSection from "@/components/shared2/products/random-supplier-section";
import NoInternet from "@/components/shared/general/no-internet";
import { notFound } from "next/navigation";
import InfiniteSuppliers from "@/components/shared2/products/infinit-suppliers";

export const metadata = {
  title: "Home",
};

export const revalidate = 120; // refresh related products every 2 min

export default async function Home() {
  const locale: "en" | "sw" = "sw"; // You can make this dynamic later

  // const supplierCount = await suppliersCount();
  const latestProducts = await getLatestProducts();
  const featuredProducts = await getFeaturedProducts();

  if (!latestProducts) return notFound(); //really no product
  if (!featuredProducts) return notFound();
  if (latestProducts === null) return <NoInternet />;
  if (featuredProducts === null) return <NoInternet />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
      <div className="lg:col-span-3 space-y-6">
        {featuredProducts.length > 0 && (
          <ProductCarousel data={featuredProducts} />
        )}

        <ProductList
          data={latestProducts}
          title="Mizigo mipya"
          limit={8}
          locale={locale}
          variant="grid"
        />
        {/* Random products now handled client-side (2 categories) */}
        <RandomProducts locale={locale} />

        {/* Featured category */}
        {/* <RandomOneSectionHeading locale={locale} /> */}

        {/* Spotlight Supplier */}
        {/* <RandomSupplierSection /> */}

        {/* Infinity Suppliers */}
        <InfiniteSuppliers />

        {/* This section is always a new random category in scroll view */}
        {/* <RandomOneSection locale={locale} /> */}

        {/* This section is always a new random category in scroll view */}
        {/* <RandomOneSection locale={locale} /> */}

        {/* Infinite random sections with random category */}
        {/* <RandomSections locale={locale} /> */}

        <ViewAllProductsButton />
        <DealCountdown />

        <IconBoxes />
      </div>
    </div>
  );
}
