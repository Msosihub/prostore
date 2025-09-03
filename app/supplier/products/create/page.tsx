import { Metadata } from "next";
import ProductForm from "@/components/supplier/product-form4";
import { requireSupplier } from "@/lib/auth-guard";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
export const metadata: Metadata = {
  title: "Create Product",
};

const CreateProductPage = async () => {
  await requireSupplier();
  const session = await auth();
  const supplier = await prisma.supplier.findUnique({
    where: { userId: session?.user?.id },
  });
  if (!supplier) return <div>Supplier not found</div>;

  const brands = await prisma.brand.findMany();
  const categories = await prisma.category.findMany();
  const subcategories = await prisma.subcategory.findMany();

  return (
    <>
      <h2 className="h2-bold">Tengeneza Bidhaa</h2>
      <div className="my-8">
        <ProductForm
          type="Create"
          supplierId={supplier.id}
          brands={brands}
          categories={categories}
          subcategories={subcategories}
        />
      </div>
    </>
  );
};

export default CreateProductPage;
