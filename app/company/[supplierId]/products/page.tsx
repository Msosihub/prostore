import ProductList from "@/components/shared/product/product-list";
import {
  getFeaturedProducts,
  getLatestProducts,
  suppliersCount,
} from "@/lib/actions/product.actions";
import IconBoxes from "@/components/icon-boxes";
import DealCountdown from "@/components/deal-countdown";
import ProductCarousel from "@/components/shared/product/product-carousel";
import RandomProducts from "@/components/shared2/products/random-products";
import RandomOneSection from "@/components/shared2/products/random-one-section";
import RandomOneSectionHeading from "@/components/shared2/products/random-one-section2";
import RandomSupplierSection from "@/components/shared2/products/random-supplier-section";
import { prisma } from "@/db/prisma";
import RandomSections from "@/components/shared2/products/random-sections";
import CompanyCategoriesProducts from "@/components/shared2/products/company_categories_sample";

export const metadata = {
  title: "Home",
};

export default async function Home({
  params,
}: {
  params: { supplierId: string };
}) {
  const locale: "en" | "sw" = "sw"; // You can make this dynamic later

  //latest products of this supplier
  const latestProducts = await prisma.product.findMany({
    where: { supplierId: params.supplierId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <ProductList
          data={latestProducts}
          title="Newest Arrivals"
          limit={4}
          locale={locale}
          variant="grid"
        />
        {/* All categories with fewer products */}
        <CompanyCategoriesProducts locale="en" supplierId={params.supplierId} />

        <IconBoxes />
      </div>
    </div>
  );
}
