// import { APP_NAME } from "@/lib/constants";
// import Image from "next/image";
// import Link from "next/link";
import Menu from "@/components/shared/header/menu";
import MainNav from "./main-nav";
import SupplierSearch from "@/components/supplier/supplier-search";
import BottomNav from "@/components/customComponents/bottom-nav-main";
import SupplierHeader from "@/components/shared2/products/supplier-section-header";
import { prisma } from "@/db/prisma";
import { Supplier } from "@/types";

export default async function SupplierLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ supplierId: string }>;
}>) {
  const paramx = await params;
  const supplierId = paramx.supplierId;
  //get That Supplier
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
  });
  if (!supplier) return;
  // Normalize nulls to undefined
  const normalizedSupplier: Supplier = {
    id: supplier.id,
    logo: supplier.logo ?? null,
    bannerUrl: supplier.bannerUrl,
    companyName: supplier.companyName,
    about: supplier.about,

    username: supplier.username ?? undefined,
    isVerified: supplier.isVerified,
    location: supplier.location || "",
    yearsActive: supplier.yearsActive,
    nation: supplier.nation,
    rating: Number(supplier.rating), // Prisma Decimal → number
    deliveryRate: supplier.deliveryRate,
    responseTime: supplier.responseTime,
    certifications: [], // or map supplier.certifications if available
  };

  return (
    <>
      <div className="flex flex-col">
        <div className="border-b container mx-auto">
          <SupplierHeader supplier={normalizedSupplier} />
          <div className="flex items-center flex-1 h-16 px-1 justify-between">
            <div className="flex items-center flex-col sm:flex-row justify-around gap-4">
              <MainNav className="mx-1 md:mx-4" supplierId={supplierId} />

              <SupplierSearch />
            </div>
            <div className="justify-end">
              <Menu />
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 p-0 pt-6 container mx-auto">
          {children}
        </div>
        <div className="p-4"></div>
        <BottomNav />
      </div>
    </>
  );
}
