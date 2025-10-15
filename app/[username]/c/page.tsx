import { notFound } from "next/navigation";
import { prisma } from "@/db/prisma"; // adjust path to your prisma instance
import HomeProducts from "@/app/company/[supplierId]/products/page";

export default async function SupplierUsernamePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const RESERVED_ROUTES = ["login", "register", "about", "company"];

  if (RESERVED_ROUTES.includes(username.toLowerCase())) {
    notFound();
  }

  const supplier = await prisma.supplier.findUnique({
    where: { username: username },
  });

  if (!supplier) {
    notFound();
  }

  // adapt the async param signature your HomePage expects:
  const supplierParams = Promise.resolve({ supplierId: supplier.id });

  // ✅ Option 1: reuse the existing SupplierHome component
  return <HomeProducts params={supplierParams} />;

  // ✅ Option 2: if SupplierHome is complex or uses fetches by ID,
  // you can render your own component here passing supplier data
}
