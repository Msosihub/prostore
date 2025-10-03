import HeroCarousel from "@/components/shared/banner/HeroCarousel";
import { PromoBlocks } from "@/components/shared/banner/PromoBlocks";
import RandomProducts from "@/components/shared2/products/random-products";
import ProductList from "@/components/shared/product/product-list";
import ProductCarousel from "@/components/shared/product/product-carousel";
import {
  getFeaturedProducts,
  getLatestProducts,
} from "@/lib/actions/product.actions";
import { prisma } from "@/db/prisma";
import ViewAllProductsButton from "@/components/view-all-products-button";
import InfiniteSuppliers from "@/components/shared2/products/infinit-suppliers";
import DealCountdown from "@/components/deal-countdown";
import IconBoxes from "@/components/icon-boxes";
import NoInternet from "@/components/shared/general/no-internet";
import BannerSection from "@/components/banner/BannerSection.server";

export const revalidate = 120;

export default async function Home() {
  const locale: "en" | "sw" = "sw";

  // Get banners from DB
  const banners = await prisma.banner.findMany({
    orderBy: { createdAt: "desc" },
  });

  const heroBanners = banners.filter((b) => b.type === "hero");
  const promoBanners = banners.filter((b) => b.type === "promo");

  const latestProducts = await getLatestProducts();
  const featuredProducts = await getFeaturedProducts();

  if (!latestProducts || !featuredProducts) return <NoInternet />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-16">
      <div className="lg:col-span-3 space-y-6">
        {/* HERO BANNERS */}
        {heroBanners.length > 0 && <HeroCarousel banners={heroBanners} />}

        <BannerSection />

        {/* <Homex /> */}

        {/* FEATURED PRODUCTS */}
        {featuredProducts.length > 0 && (
          <ProductCarousel data={featuredProducts} />
        )}

        <ProductList
          data={latestProducts}
          title="Mizigo mipya"
          limit={8}
          locale={locale}
          variant="scroll"
        />

        {/* PROMO BLOCKS */}
        {promoBanners.length > 0 && <PromoBlocks banners={promoBanners} />}

        {/* <RandomProducts locale={locale} /> */}

        <InfiniteSuppliers />

        <ViewAllProductsButton />
        <DealCountdown />
        <IconBoxes />
      </div>
    </div>
  );
}
