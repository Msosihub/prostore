export const dynamic = "force-dynamic";

import ProductForm from "@/components/supplier/product-form4";
import { getProductById } from "@/lib/actions/product.actions";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSupplier } from "@/lib/auth-guard";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import Link from "next/link";
import { ChevronLeft, Edit } from "lucide-react";

export const metadata: Metadata = {
  title: "Sasisha Bidhaa | Supplier Dashboard",
};

export default async function SupplierProductUpdatePage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireSupplier();
  const session = await auth();

  const supplier = await prisma.supplier.findUnique({
    where: { userId: session?.user?.id },
  });
  if (!supplier)
    return (
      <div className="text-xs font-semibold text-slate-400 text-center py-12">
        Profaili ya muuzaji haikupatikana.
      </div>
    );

  const { id } = await props.params;
  const product = await getProductById(id);

  if (!product) return notFound();

  const brands = await prisma.brand.findMany();
  const categories = await prisma.category.findMany();
  const subcategories = await prisma.subcategory.findMany();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 select-none">
      {/* Dynamic Nav Row header elements */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 px-1">
        <Link
          href="/supplier/products"
          className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="space-y-0.5">
          <h1 className="text-base font-extrabold md:text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
            <Edit className="w-4 h-4 text-slate-500" />
            Badili Taarifa za Bidhaa
          </h1>
          <p className="text-xs text-slate-400">
            Hariri bei ya jumla, akiba au picha za bidhaa yako:{" "}
            <span className="font-bold font-mono text-slate-700">
              {product.name}
            </span>
          </p>
        </div>
      </div>

      <div className="w-full">
        <ProductForm
          type="Update"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          product={product as any}
          productId={product.id}
          supplierId={supplier.id}
          brands={brands}
          categories={categories.map((c) => ({
            ...c,
            image: c.image ?? undefined,
          }))}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          subcategories={subcategories as any}
        />
      </div>
    </div>
  );
}
