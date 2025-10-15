import ProductList from "@/components/shared/product/product-list";
import IconBoxes from "@/components/icon-boxes";
import { prisma } from "@/db/prisma";
import CompanyCategoriesProducts from "@/components/shared2/products/company_categories_sample";
import { Product } from "@/types";

export const metadata = {
  title: "Products",
};

export default async function HomeProducts({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const locale: "en" | "sw" = "sw"; // You can make this dynamic later
  const { supplierId } = await params;

  function serializeProduct(product: Product) {
    return {
      ...product,
      createdAt: product.createdAt?.toISOString(),
      // Add other fields if needed
    };
  }

  //latest products of this supplier
  const latestProductsRaw = await prisma.product.findMany({
    where: { supplierId: supplierId },
    orderBy: { createdAt: "desc" },
    include: {
      supplier: true,
      category: true,
      brand: true,
      subcategory: true,
      pricingTiers: true,
    },
    take: 6,
  });

  const latestProductsx = latestProductsRaw.map(serializeProduct);
  const latestProducts = JSON.parse(JSON.stringify(latestProductsx));

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
