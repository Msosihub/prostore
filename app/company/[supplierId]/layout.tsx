import { APP_NAME } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import Menu from "@/components/shared/header/menu";
import MainNav from "./main-nav";
import SupplierSearch from "@/components/supplier/supplier-search";
import BottomNav from "@/components/customComponents/bottom-nav-main";

export default async function SupplierLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ supplierId: string }>;
}>) {
  const paramx = await params;
  const supplierId = paramx.supplierId;
  return (
    <>
      <div className="flex flex-col">
        <div className="border-b container mx-auto">
          <div className="flex items-center h-16 px-4">
            <Link href="/" className="w-22">
              <Image
                src="/images/logo.svg"
                height={48}
                width={48}
                alt={APP_NAME}
              />
            </Link>
            <MainNav className="mx-6" supplierId={supplierId} />
            <div className="ml-auto items-center flex space-x-4">
              <SupplierSearch />
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
