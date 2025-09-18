export const dynamic = "force-dynamic";
import ProductForm from "@/components/supplier/product-form4";
import { getProductById } from "@/lib/actions/product.actions";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSupplier } from "@/lib/auth-guard";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

export const metadata: Metadata = {
  title: "Update Product",
};

const SupplierProductUpdatePage = async (props: {
  params: Promise<{
    id: string;
  }>;
}) => {
  await requireSupplier();
  const session = await auth();
  const supplier = await prisma.supplier.findUnique({
    where: { userId: session?.user?.id },
  });
  if (!supplier) return <div>Supplier not found</div>;

  const { id } = await props.params;

  const product = await getProductById(id);

  //console.log("Here are the product values:", product);

  const brands = await prisma.brand.findMany();
  const categories = await prisma.category.findMany();
  const subcategories = await prisma.subcategory.findMany();

  if (!product) return notFound();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <h1 className="h2-bold">Update Product</h1>

      <ProductForm
        type="Update"
        product={product}
        productId={product.id}
        supplierId={supplier.id}
        brands={brands}
        categories={categories.map((c) => ({
          ...c,
          image: c.image ?? undefined, // convert null to undefined
        }))}
        subcategories={subcategories}
      />
    </div>
  );
};

export default SupplierProductUpdatePage;
