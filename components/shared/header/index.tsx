"use client";

import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import Menu from "./menu";
import CategoryDrawer from "./category-drawer";
import Search from "./search";
import CategoryPreviewBar from "./category-preview-bar";
import { useState } from "react";

interface HeaderProps {
  cartItemsCount?: number;
}

export default function Header({ cartItemsCount = 0 }: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    // 🟢 FIXED: Removed conflicting custom text styles and color flashes to match premium marketplace designs
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 transition-all duration-200">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Main Header Inner Grid Wrapper Row */}
        <div className="flex flex-col gap-2 py-2">
          {/* Top Row: Brand Logo, Global Search Input, and Nav Actions Menu */}
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Desktop Brand Logo Layout (Hidden on Mobile viewports) */}
            <div className="hidden md:flex items-center shrink-0">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/images/logo.svg"
                  alt={`${APP_NAME} logo`}
                  height={36}
                  width={36}
                  priority
                  className="object-contain"
                />
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  {APP_NAME}
                </span>
              </Link>
            </div>

            {/* Global Search Input Area (Expands intelligently to consume available width footprint) */}
            <div className="flex-1 min-w-0">
              <Search />
            </div>

            {/* Quick Action Menu Links Block */}
            <div className="shrink-0 flex items-center">
              <Menu cartItemsCount={cartItemsCount} />
            </div>
          </div>

          {/* Bottom Row: Dynamic Horizontal Category Scroll Bar */}
          <div className="w-full border-t border-slate-50/60 pt-1.5 flex items-center">
            <CategoryPreviewBar onOpenDrawer={() => setDrawerOpen(true)} />
          </div>
        </div>

        <CategoryDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      </div>
    </header>
  );
}
