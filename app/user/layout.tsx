import { APP_NAME } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import Menu from "@/components/shared/header/menu";
import MainNav from "./main-nav";

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="flex flex-col">
        <div className="border-b container mx-auto">
          <div className="flex min-h-16 flex-wrap items-center gap-y-3 px-4 py-3">
            <Link href="/" className="shrink-0">
              <Image
                src="/images/logo.svg"
                height={48}
                width={48}
                alt={APP_NAME}
              />
            </Link>
            <MainNav className="order-3 w-full sm:order-none sm:mx-6 sm:w-auto" />
            <div className="ml-auto items-center flex space-x-4">
              <Menu />
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 p-0 pt-6 container mx-auto">
          {children}
        </div>
      </div>
    </>
  );
}
