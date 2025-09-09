import ProductList from "@/components/shared/product/product-list";
import IconBoxes from "@/components/icon-boxes";
import { prisma } from "@/db/prisma";
import CompanyCategoriesProducts from "@/components/shared2/products/company_categories_sample";

export const metadata = {
  title: "Home",
};

export default async function Home({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const locale: "en" | "sw" = "sw"; // You can make this dynamic later
  const { supplierId } = await params;
  //latest products of this supplier
  const latestProducts = await prisma.product.findMany({
    where: { supplierId: supplierId },
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
        <CompanyCategoriesProducts locale="en" supplierId={supplierId} />

        <IconBoxes />
      </div>
    </div>
  );
}
