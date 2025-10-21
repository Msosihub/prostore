import HeroCarousel from "@/components/shared/banner/HeroCarousel";
import { PromoBlocks } from "@/components/shared/banner/PromoBlocks";
// import RandomProducts from "@/components/shared2/products/random-products";
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

import { Banner } from "@/types";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const revalidate = 120;

export const metadata: Metadata = {
  title: `${APP_NAME} | Soko Lako la Kuaminika Afrika Mashariki`,
  description:
    "Gundua wasambazaji wa kuaminika, bidhaa zilizothibitishwa, na ununuzi rahisi bila usumbufu kote Tanzania na Afrika Mashariki.",
  openGraph: {
    title: `${APP_NAME} | Soko Lako la Kuaminika Afrika Mashariki`,
    description:
      "Gundua wasambazaji wa kuaminika, bidhaa zilizothibitishwa, na ununuzi rahisi bila usumbufu kote Tanzania na Afrika Mashariki.",
    url: "https://nimboya.com", // ✅ Change this to your actual domain
    siteName: `${APP_NAME}`,
    images: [
      {
        url: "https://fdd5alqxb0.ufs.sh/f/LUPV9JBgc2WRHhNDXgfqpUVcTir2JAv7t5slwkMz9NPZaLxu", // ✅ Change this to your actual homepage banner image
        width: 1200,
        height: 630,
        alt: "Nimboya homepage banner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} | Soko Lako la Kuaminika Afrika Mashariki`,
    description:
      "Gundua wasambazaji wa kuaminika, bidhaa zilizothibitishwa, na ununuzi rahisi bila usumbufu kote Tanzania na Afrika Mashariki.",
    images: [
      "https://fdd5alqxb0.ufs.sh/f/LUPV9JBgc2WRHhNDXgfqpUVcTir2JAv7t5slwkMz9NPZaLxu",
    ], // ✅ Same image as above
  },
};

export default async function Home() {
  const locale: "en" | "sw" = "sw";

  // Get banners from DB
  let banners;
  try {
    banners = await prisma.banner.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.log("Error Banner: ", error);
  }

  let heroBanners: Banner[] = [];
  let promoBanners: Banner[] = [];
  if (banners) {
    heroBanners = banners.filter((b) => b.type === "hero");
    promoBanners = banners.filter((b) => b.type === "promo");
  }

  const latestProducts = await getLatestProducts();
  const featuredProducts = await getFeaturedProducts();

  if (!latestProducts || !featuredProducts) return <NoInternet />;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-16">
        <div className="lg:col-span-3 space-y-6">
          <div className="hidden md:block">
            {/* HERO BANNERS */}
            {heroBanners.length > 0 && <HeroCarousel banners={heroBanners} />}
          </div>

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
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Nimboya",
          url: "https://www.nimboya.com", // ✅ Change to your domain
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.nimboya.com/search?q={search_term_string}", // ✅ Change to your search URL
            "query-input": "required name=search_term_string",
          },
        })}
      </script>
      ;
    </>
  );
}
