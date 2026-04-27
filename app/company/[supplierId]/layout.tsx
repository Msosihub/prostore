// import { APP_NAME } from "@/lib/constants";
// import Image from "next/image";
// import Link from "next/link";
import Menu from "@/components/shared/header/menu";
import MainNav from "./main-nav";
import SupplierSearch from "@/components/supplier/supplier-search";
import BottomNav from "@/components/customComponents/bottom-nav-main";
// import SupplierHeader from "@/components/shared2/products/supplier-section-header";
import { prisma } from "@/db/prisma";
// import { Supplier } from "@/types";

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
  // const normalizedSupplier: Supplier = {
  //   id: supplier.id,
  //   logo: supplier.logo ?? null,
  //   bannerUrl: supplier.bannerUrl,
  //   companyName: supplier.companyName,
  //   about: supplier.about,

  //   username: supplier.username ?? undefined,
  //   isVerified: supplier.isVerified,
  //   location: supplier.location || "",
  //   yearsActive: supplier.yearsActive,
  //   nation: supplier.nation,
  //   rating: Number(supplier.rating), // Prisma Decimal → number
  //   deliveryRate: supplier.deliveryRate,
  //   responseTime: supplier.responseTime,
  //   certifications: [], // or map supplier.certifications if available
  // };

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <div className="border-b bg-white sticky top-0 z-50">
          {/* Removed 'container' here to prevent squeezing; using px-4 instead */}
          <div className="max-w-7xl mx-auto">
            {/* <SupplierHeader supplier={normalizedSupplier} /> */}

            {/* Mobile: Search + Menu on one line | Desktop: Nav + Search + Menu */}
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 py-2 px-3 md:h-16">
              {/* Row 1: Search & Menu (Side by side on mobile) */}
              <div className="flex items-center w-full gap-2 md:order-2 md:ml-auto md:max-w-md">
                <div className="flex-1">
                  <SupplierSearch />
                </div>
                {/* Menu now visible on mobile next to search */}
                <div className="md:hidden flex-none">
                  <Menu />
                </div>
              </div>

              {/* Row 2: Nav Links (Scrollable on mobile) */}
              <div className="w-full md:w-auto overflow-x-auto no-scrollbar md:order-1 border-t md:border-none mt-1 md:mt-0 pt-1 md:pt-0">
                <MainNav
                  className="flex flex-nowrap whitespace-nowrap"
                  supplierId={supplierId}
                />
              </div>

              {/* Desktop only Menu placement */}
              <div className="hidden md:block md:order-3">
                <Menu />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-7xl mx-auto w-full pt-4 mb-4">
          {children}
        </div>

        <BottomNav />
      </div>
    </>
  );
}
