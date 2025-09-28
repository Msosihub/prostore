"use client";
import { APP_NAME } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import Menu from "@/components/shared/header/menu";
import MainNav from "./main-nav";
import SupplierSearch from "@/components/supplier/supplier-search";
import { MenuIcon, X } from "lucide-react";
import { useState } from "react";

export default function SupplierLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const togglerButton = (
    <button
      className=" mr-2"
      onClick={() => setDrawerOpen(true)}
      aria-label="Open drawer"
    >
      <MenuIcon className="w-6 h-6" />
    </button>
  );

  return (
    <>
      <div className="flex flex-col w-full">
        <div className="border-b container mx-auto ">
          <div className="flex items-center h-16 px-4 justify-between">
            {/* LEFT SIDE */}
            <div className="flex items-center space-x-2">
              {/* ✅ Drawer toggle button */}
              {togglerButton}

              {/* Logo */}
              <Link href="/" className="w-22 hidden ">
                <Image
                  src="/images/logo.svg"
                  height={48}
                  width={48}
                  alt={APP_NAME}
                />
              </Link>

              {/* Main navigation */}
              <MainNav className="mx-2  flex" />
            </div>

            {/* RIGHT SIDE */}
            <div className="flex items-center space-x-2">
              <div className=" w-full max-w-md">
                <SupplierSearch />
              </div>
              <Menu />
            </div>
          </div>
        </div>

        <div className="flex-1 w-full space-y-4 p-0 pt-6 container mx-auto">
          {children}
        </div>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div
              className="bg-black/50 w-full"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer */}
            <div className="bg-white w-64 p-4 shadow-lg">
              <button
                className="mb-4"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>

              <nav className="space-y-4 flex flex-col  border-b">
                <Link href="/supplier/profile/profile">Profile</Link>
                <Link href="/supplier/documents">Documents</Link>
              </nav>
              <nav className="space-y-4 flex flex-col  border-b">
                <Link href="/supplier/users/">User</Link>
              </nav>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
