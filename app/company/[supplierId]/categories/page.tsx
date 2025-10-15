import IconBoxes from "@/components/icon-boxes";
import CompanyCategoriesProducts from "@/components/shared2/products/company_categories_sample";

export const metadata = {
  title: "Home",
};

export default async function Home({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  // const locale: "en" | "sw" = "sw"; // You can make this dynamic later
  const paramsx = await params;
  const supplierId = await paramsx.supplierId;

  //latest products of this supplier

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-3 space-y-6">
        {/* All categories with fewer products */}
        <CompanyCategoriesProducts locale="en" supplierId={supplierId} />

        <IconBoxes />
      </div>
    </div>
  );
}
