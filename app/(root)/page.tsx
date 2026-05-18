import HeroCarousel from "@/components/shared/banner/HeroCarousel";
import ProductList from "@/components/shared/product/product-list";
import ProductCarousel from "@/components/shared/product/product-carousel";
import {
  getFeaturedProducts,
  getLatestProducts,
} from "@/lib/actions/product.actions";
import { prisma } from "@/db/prisma";
import InfiniteSuppliers from "@/components/shared2/products/infinit-suppliers";
import NoInternet from "@/components/shared/general/no-internet";
import BannerSection from "@/components/banner/BannerSection.server";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import Link from "next/link";
import { Banner } from "@/types";

export const revalidate = 120;

export const metadata: Metadata = {
  title: `${APP_NAME} | Soko Lako la Kuaminika Afrika Mashariki`,
  description:
    "Gundua wasambazaji wa kuaminika, bidhaa zilizothibitishwa, na ununuzi rahisi bila usumbufu kote Tanzania na Afrika Mashariki.",
  openGraph: {
    title: `${APP_NAME} | Soko Lako la Kuaminika Afrika Mashariki`,
    description:
      "Gundua wasambazaji wa kuaminika, bidhaa zilizothibitishwa, na ununuzi rahisi bila usumbufu kote Tanzania na Afrika Mashariki.",
    url: "https://nimboya.com",
    siteName: `${APP_NAME}`,
    images: [
      {
        url: "https://ufs.sh",
        width: 1200,
        height: 630,
        alt: "Nimboya homepage banner",
      },
    ],
    locale: "sw_TZ",
    type: "website",
  },
};

export default async function Home() {
  const locale: "en" | "sw" = "sw";

  let banners: Banner[] = [];
  try {
    banners = await prisma.banner.findMany({ orderBy: { createdAt: "desc" } });
  } catch (error) {
    console.error("Error fetching banners: ", error);
  }

  const heroBanners = banners ? banners.filter((b) => b.type === "hero") : [];
  const latestProducts = await getLatestProducts();
  const featuredProducts = await getFeaturedProducts();

  if (!latestProducts || !featuredProducts) return <NoInternet />;

  return (
    <div className="w-full space-y-6 pb-12 pt-2">
      {/* 🟢 BANNER SECTION */}
      {heroBanners.length > 0 && (
        <div className="hidden md:block w-full overflow-hidden">
          <HeroCarousel banners={heroBanners} />
        </div>
      )}

      {/* 🟢 CATEGORY GROUP BLOCKS */}
      <div className="w-full">
        <BannerSection />
      </div>

      {/* 🟢 FEATURED SLIDERS */}
      {featuredProducts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold md:text-lg text-slate-900 tracking-tight">
              Bidhaa Zilizochaguliwa
            </h2>
            <Link
              href="/search"
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              Zote
            </Link>
          </div>
          <ProductCarousel data={featuredProducts} />
        </div>
      )}

      {/* 🟢 LATEST PRODUCT GRID (Removed background card container and strict internal padding bounds) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold md:text-lg text-slate-900 tracking-tight">
            Mizigo Mipya
          </h2>
          <Link
            href="/search"
            className="text-xs font-semibold text-orange-600 hover:underline"
          >
            Ona Zote
          </Link>
        </div>

        <ProductList
          data={latestProducts}
          title=""
          limit={8}
          locale={locale}
          variant="grid"
          notext={true}
        />
      </div>

      {/* 🟢 SUPPLIERS SECTION (Removed grey block background layer and container cards) */}
      <div className="space-y-2 pt-2">
        <h2 className="text-sm font-bold md:text-lg text-slate-900 tracking-tight">
          Wasambazaji Waliothibitishwa
        </h2>
        <InfiniteSuppliers />
      </div>

      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Nimboya",
          url: "https://nimboya.com",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://nimboya.com/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        })}
      </script>
    </div>
  );
}
